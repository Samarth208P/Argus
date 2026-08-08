"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { DbScore, DbProvider } from "@/lib/db/types";
import { rankRPCs, bestRPC, leaderAdvantage, type RankedRPC } from "@/lib/rpc";

export interface SeriesPoint {
  t: number; // epoch ms
  score: number;
  latency: number;
  accuracy: number;
  uptime: number;
}

const MAX_POINTS = 240;
const POLL_MS = 30_000;

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
    let cancelled = false;
    const poll = async () => {
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/scores", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as DbScore[];
          if (Array.isArray(data) && data.length) {
            const now = Date.now();
            setScores(data);
            setLastUpdated(now);
            appendPoints(data, now);
          }
        }
      } catch {
        // stay on last good data
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    };
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [appendPoints]);

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
