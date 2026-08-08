"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { DbScore, DbProvider } from "@/lib/db/types";
import { rankRPCs, bestRPC, leaderAdvantage, type RankedRPC } from "@/lib/rpc";
import { fanOutRPC } from "@/lib/engine/poller";
import { determineConsensus, extractBlockTuple } from "@/lib/engine/consensus";
import { checkFreshness } from "@/lib/engine/classifier";
import { computeScore } from "@/lib/engine/scorer";
import { getIndependenceShare } from "@/lib/engine/registry";

const TARGET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

export interface SeriesPoint {
  t: number; // epoch ms
  score: number;
  latency: number;
  accuracy: number;
  uptime: number;
}

const MAX_POINTS = 240;
const POLL_MS = 15_000;

function toPoint(s: DbScore, t: number): SeriesPoint {
  return { t, score: s.score, latency: s.latency_avg, accuracy: s.accuracy * 100, uptime: s.uptime * 100 };
}

/**
 * Single live data source. Seeds a real time-series from server rows, then
 * appends points from the existing /api/scores polling mechanism. No fake
 * "live" behaviour — points only arrive when a poll returns.
 */
export function useLiveScores({
  initialScores,
  providers,
  initialRows,
}: {
  initialScores: DbScore[];
  providers: DbProvider[];
  initialRows?: DbScore[];
}) {
  const [scores, setScores] = useState<DbScore[]>(initialScores);
  const [lastUpdated, setLastUpdated] = useState<number>(() => Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scoresRef = useRef<DbScore[]>(initialScores);

  // Build the seed series from server-provided rows (real, timestamped).
  const seed = useMemo(() => {
    const map = new Map<string, SeriesPoint[]>();
    const rows = initialRows && initialRows.length ? initialRows : initialScores;
    for (const r of rows) {
      const arr = map.get(r.provider_id) ?? [];
      arr.push(toPoint(r, new Date(r.t).getTime()));
      map.set(r.provider_id, arr);
    }
    // ensure ascending by time
    for (const arr of map.values()) arr.sort((a, b) => a.t - b.t);
    return map;
  }, [initialRows, initialScores]);

  const historyRef = useRef<Map<string, SeriesPoint[]>>(new Map(seed));
  const [historyVersion, setHistoryVersion] = useState(0);
  const providerWeightMap = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, getIndependenceShare(p.id, providers as any)])),
    [providers]
  );

  const appendPoints = useCallback((rows: DbScore[], t: number) => {
    const map = historyRef.current;
    for (const r of rows) {
      const arr = map.get(r.provider_id) ?? [];
      const last = arr[arr.length - 1];
      // only append if it's a genuinely newer sample
      if (!last || t - last.t > 1_000) {
        arr.push(toPoint(r, t));
        if (arr.length > MAX_POINTS) arr.splice(0, arr.length - MAX_POINTS);
        map.set(r.provider_id, arr);
      }
    }
    setHistoryVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  const pollLiveScores = useCallback(async () => {
    if (isRefreshing || providers.length === 0) return;
    setIsRefreshing(true);

    try {
      const blockResults = await fanOutRPC(providers, "eth_blockNumber", []);
      const blockNumbers = blockResults
        .filter((r) => r.status === "ok" && r.result)
        .map((r) => BigInt(r.result as string));

      if (blockNumbers.length < 3) {
        return;
      }

      const poolMax = blockNumbers.reduce((a, b) => (b > a ? b : a), 0n);
      const pinnedBlock = poolMax > 10n ? poolMax - 10n : poolMax;
      const pinnedBlockHex = "0x" + pinnedBlock.toString(16);

      const [balanceResults, blockDataResults] = await Promise.all([
        fanOutRPC(providers, "eth_getBalance", [TARGET_ADDRESS, pinnedBlockHex]),
        fanOutRPC(providers, "eth_getBlockByNumber", [pinnedBlockHex, false]),
      ]);

      const balanceConsensus = await determineConsensus(
        balanceResults.map((r) => ({ providerId: r.id, result: r.result, latencyMs: r.latencyMs, status: r.status })),
        providerWeightMap
      );
      const blockConsensus = await determineConsensus(
        blockDataResults.map((r) => ({
          providerId: r.id,
          result: r.result && typeof r.result === "object" ? extractBlockTuple(r.result as Record<string, string>) : r.result,
          latencyMs: r.latencyMs,
          status: r.status,
        })),
        providerWeightMap
      );

      const now = Date.now();
      const currentScores = [...scoresRef.current];
      const nextScores: DbScore[] = [];
      const nextLatestByProvider = new Map<string, DbScore>();

      for (const p of providers) {
        const pHistory = currentScores
          .filter((s) => s.provider_id === p.id)
          .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
          .slice(-49);

        const balanceRow = balanceResults.find((r) => r.id === p.id);
        const blockRow = blockDataResults.find((r) => r.id === p.id);
        const latestBlockRow = blockResults.find((r) => r.id === p.id);

        const latestBlockNum = latestBlockRow?.status === "ok" && latestBlockRow.result ? BigInt(latestBlockRow.result as string) : 0n;
        const lagBlocks = latestBlockNum > 0n ? checkFreshness(latestBlockNum, poolMax) : 999;

        const wasInConsensus =
          balanceRow?.status === "ok" &&
          blockRow?.status === "ok" &&
          (balanceConsensus.status !== "CONSENSUS" || !balanceConsensus.outliers.includes(p.id)) &&
          (blockConsensus.status !== "CONSENSUS" || !blockConsensus.outliers.includes(p.id));

        const pollRecord = {
          providerId: p.id,
          wasInConsensus,
          wasOnline: balanceRow?.status === "ok",
          latencyMs: balanceRow?.latencyMs ?? 0,
          lagBlocks,
        };

        const existing = pHistory.map((h) => ({
          providerId: h.provider_id,
          wasInConsensus: h.accuracy > 0.5,
          wasOnline: h.uptime > 0.5,
          latencyMs: h.latency_avg,
          lagBlocks: h.freshness_score > 0.5 ? 0 : 3,
        }));

        const computed = computeScore([...existing, pollRecord]);
        const scoreRow: DbScore = {
          id: `${p.id}-score-${now}`,
          t: new Date(now).toISOString(),
          provider_id: p.id,
          score: computed.score,
          accuracy: computed.accuracy,
          uptime: computed.uptime,
          latency_avg: computed.latencyAvg,
          freshness_score: computed.freshnessScore,
          trend: computed.trend,
        };

        nextScores.push(scoreRow);
        nextLatestByProvider.set(p.id, scoreRow);
      }

      const latestScores = providers
        .map((p) => nextLatestByProvider.get(p.id))
        .filter((row): row is DbScore => Boolean(row));

      setScores(latestScores);
      scoresRef.current = latestScores;
      setLastUpdated(now);
      appendPoints(nextScores, now);

      fetch("/api/poll/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: nextScores, incidents: [] }),
      }).catch(() => {
        // The hero still updates locally even if server sync is unavailable.
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [appendPoints, isRefreshing, providerWeightMap, providers]);

  useEffect(() => {
    void pollLiveScores();
    const id = setInterval(() => {
      void pollLiveScores();
    }, POLL_MS);
    return () => {
      clearInterval(id);
    };
  }, [pollLiveScores]);

  const ranked: RankedRPC[] = useMemo(() => rankRPCs(scores, providers), [scores, providers]);
  const best = useMemo(() => bestRPC(ranked), [ranked]);
  const advantage = useMemo(() => leaderAdvantage(ranked), [ranked]);

  // series keyed by provider, ordered by current rank
  const series = useMemo(() => {
    // historyVersion is a dependency to recompute on append
    void historyVersion;
    return ranked.map((r) => ({
      providerId: r.provider_id,
      rank: r.rank,
      points: historyRef.current.get(r.provider_id) ?? [],
    }));
  }, [ranked, historyVersion]);

  return { scores, ranked, best, advantage, lastUpdated, isRefreshing, series };
}
