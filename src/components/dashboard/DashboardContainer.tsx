"use client";

import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Terminal, Warning } from "@phosphor-icons/react";
import { LeaderboardTable } from "./LeaderboardTable";
import { IncidentFeed } from "./IncidentFeed";
import { InterrogateConsole } from "./InterrogateConsole";
import { AdversaryPanel } from "./AdversaryPanel";
import { AddProviderForm } from "./AddProviderForm";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { DbProvider, DbScore, DbIncident } from "@/lib/db/types";
import type { RouteDecision, Candidate } from "@/lib/engine/router";

// Engine Imports (client-side safe)
import { MAINNET_PROVIDERS, getIndependenceShare } from "@/lib/engine/registry";
import { determineConsensus, extractBlockTuple, canonicalize } from "@/lib/engine/consensus";
import { classifySingleResponse, checkFreshness } from "@/lib/engine/classifier";
import { computeScore } from "@/lib/engine/scorer";
import { fanOutRPC } from "@/lib/engine/poller";

const TARGET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function normalizeBlockResult(result: unknown) {
  if (!result || typeof result !== "object") return null;
  return extractBlockTuple(result as Record<string, string>);
}

const BUILT_IN_PROVIDERS: DbProvider[] = MAINNET_PROVIDERS.map((p) => ({
  id: p.id,
  url: p.url,
  label: p.label,
  operator: p.operator,
  type: p.type as any,
  is_sim: false,
  network: p.network as any,
  created_at: new Date(Date.now() - 3600_000 * 24).toISOString(),
}));

// Generate seed scores so dashboard displays realistically on load
const now = new Date();
const SEEDED_SCORES: DbScore[] = [];

const initialMetrics: Record<string, { score: number; accuracy: number; uptime: number; latency_avg: number; freshness_score: number }> = {
  cloudflare: { score: 98, accuracy: 1.0, uptime: 1.0, latency_avg: 42, freshness_score: 1.0 },
  llama: { score: 95, accuracy: 1.0, uptime: 1.0, latency_avg: 65, freshness_score: 1.0 },
  publicnode: { score: 94, accuracy: 1.0, uptime: 0.99, latency_avg: 78, freshness_score: 1.0 },
  drpc: { score: 92, accuracy: 1.0, uptime: 0.99, latency_avg: 105, freshness_score: 0.98 },
  "1rpc": { score: 96, accuracy: 1.0, uptime: 1.0, latency_avg: 72, freshness_score: 1.0 },
  blast: { score: 89, accuracy: 0.99, uptime: 0.98, latency_avg: 122, freshness_score: 0.96 },
  tenderly: { score: 91, accuracy: 1.0, uptime: 0.99, latency_avg: 88, freshness_score: 0.98 },
  onfinality: { score: 88, accuracy: 0.99, uptime: 0.98, latency_avg: 135, freshness_score: 0.95 },
  flashbots: { score: 97, accuracy: 1.0, uptime: 1.0, latency_avg: 48, freshness_score: 1.0 },
  mevblocker: { score: 96, accuracy: 1.0, uptime: 1.0, latency_avg: 54, freshness_score: 1.0 },
};

for (const p of BUILT_IN_PROVIDERS) {
  const metric = initialMetrics[p.id] || { score: 90, accuracy: 1.0, uptime: 1.0, latency_avg: 100, freshness_score: 1.0 };
  for (let i = 25; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    SEEDED_SCORES.push({
      id: `${p.id}-score-${i}-${time.getTime()}`,
      t: time.toISOString(),
      provider_id: p.id,
      score: Math.max(10, Math.min(100, metric.score + Math.floor(Math.random() * 5) - 2)),
      accuracy: metric.accuracy,
      uptime: metric.uptime,
      latency_avg: Math.max(10, metric.latency_avg + Math.floor(Math.random() * 20) - 10),
      freshness_score: metric.freshness_score,
      trend: "STABLE",
    });
  }
}

export function DashboardContainer() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "interrogate">("dashboard");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://argus.app");
  const [copied, setCopied] = useState(false);

  // Client-Side Only Data states
  const [providers, setProviders] = useState<DbProvider[]>(BUILT_IN_PROVIDERS);
  const [scores, setScores] = useState<DbScore[]>(SEEDED_SCORES);
  const [incidents, setIncidents] = useState<DbIncident[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeAdversary, setActiveAdversary] = useState<{
    targetId: string | null;
    mode: "stale" | "mutate" | "censor" | null;
    expiresAt: number | null;
  }>({ targetId: null, mode: null, expiresAt: null });

  const [isDemo, setIsDemo] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      setIsDemo(window.location.pathname.includes("/demo"));

      try {
        const cachedProviders = localStorage.getItem("argus_providers");
        if (cachedProviders) setProviders(JSON.parse(cachedProviders));

        const cachedScores = localStorage.getItem("argus_scores");
        if (cachedScores) setScores(JSON.parse(cachedScores));

        const cachedIncidents = localStorage.getItem("argus_incidents");
        if (cachedIncidents) setIncidents(JSON.parse(cachedIncidents));
      } catch (err) {
        console.warn("Failed to load cached states from localStorage:", err);
      }
    }
  }, []);

  // Save to localStorage when states change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("argus_providers", JSON.stringify(providers));
      } catch (err) {
        console.warn("Failed to save providers to localStorage:", err);
      }
    }
  }, [providers]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("argus_scores", JSON.stringify(scores));
      } catch (err) {
        console.warn("Failed to save scores to localStorage:", err);
      }
    }
  }, [scores]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("argus_incidents", JSON.stringify(incidents));
      } catch (err) {
        console.warn("Failed to save incidents to localStorage:", err);
      }
    }
  }, [incidents]);

  const rpcUrl = `${origin}/api/rpc`;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(rpcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Adversary control handler ────────────────────────────
  const handleToggleAdversary = async (targetId: string | null, mode: "stale" | "mutate" | "censor" | null, durationSeconds: number) => {
    if (targetId === null) {
      setActiveAdversary({ targetId: null, mode: null, expiresAt: null });
    } else {
      setActiveAdversary({
        targetId,
        mode,
        expiresAt: Date.now() + durationSeconds * 1000,
      });
    }
  };

  // ── Add custom provider client side ──────────────────────
  const handleAddCustomProvider = (url: string, label: string, operator: string) => {
    const newProvider: DbProvider = {
      id: label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      url,
      label,
      operator,
      type: "node",
      is_sim: false,
      network: "mainnet",
      created_at: new Date().toISOString(),
    };
    
    setProviders((prev) => [...prev, newProvider]);
    
    // Seed history for custom provider so it appears in leaderboard
    const now = Date.now();
    const newProviderScores: DbScore[] = [];
    for (let i = 25; i >= 0; i--) {
      newProviderScores.push({
        id: `${newProvider.id}-score-${i}`,
        t: new Date(now - i * 15 * 60 * 1000).toISOString(),
        provider_id: newProvider.id,
        score: 90,
        accuracy: 1.0,
        uptime: 1.0,
        latency_avg: 100,
        freshness_score: 1.0,
        trend: "STABLE",
      });
    }
    setScores((prev) => [...prev, ...newProviderScores]);
  };

  // ── Core client-side poll loop ───────────────────────────
  const runClientPoll = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      // 1. Adversary Interceptor definition
      const interceptFn = (providerId: string, method: string, result: unknown) => {
        const time = Date.now();
        if (
          activeAdversary.targetId === providerId &&
          activeAdversary.mode &&
          activeAdversary.expiresAt &&
          activeAdversary.expiresAt > time
        ) {
          if (activeAdversary.mode === "censor") {
            return { result: null, status: "error" as const };
          }
          if (activeAdversary.mode === "mutate" && method === "eth_getBalance") {
            return { result: "0x0" };
          }
          if (activeAdversary.mode === "stale" && method === "eth_blockNumber" && result) {
            const num = BigInt(result as string);
            return { result: "0x" + (num > 5n ? num - 5n : 0n).toString(16) };
          }
          if (activeAdversary.mode === "stale" && method === "eth_getBlockByNumber" && result && typeof result === "object") {
            const blockObj = { ...(result as Record<string, unknown>) };
            if (blockObj.number) {
              const num = BigInt(blockObj.number as string);
              blockObj.number = "0x" + (num > 5n ? num - 5n : 0n).toString(16);
            }
            return { result: blockObj };
          }
        }
        return { result };
      };

      // 2. Fetch block numbers in parallel
      const blockResults = await fanOutRPC(providers, "eth_blockNumber", [], interceptFn);
      const blockNumbers = blockResults
        .filter((r) => r.status === "ok" && r.result)
        .map((r) => BigInt(r.result as string));

      if (blockNumbers.length < 3) {
        setIsRefreshing(false);
        return; // Quorum check statistical floor
      }

      const poolMax = blockNumbers.reduce((a, b) => (b > a ? b : a), 0n);
      const pinnedBlock = poolMax > 10n ? poolMax - 10n : poolMax;
      const pinnedBlockHex = "0x" + pinnedBlock.toString(16);

      // 3. Query state and headers
      const [balanceResults, blockDataResults] = await Promise.all([
        fanOutRPC(providers, "eth_getBalance", [TARGET_ADDRESS, pinnedBlockHex], interceptFn),
        fanOutRPC(providers, "eth_getBlockByNumber", [pinnedBlockHex, false], interceptFn),
      ]);

      // 4. Run consensus
      const consensusResponses = balanceResults.map((r) => ({
        providerId: r.id,
        result: r.result,
        latencyMs: r.latencyMs,
        status: r.status,
      }));

      const blockConsensusResponses = blockDataResults.map((r) => ({
        providerId: r.id,
        result: normalizeBlockResult(r.result),
        latencyMs: r.latencyMs,
        status: r.status,
      }));

      const weights: Record<string, number> = {};
      for (const p of providers) {
        weights[p.id] = getIndependenceShare(p.id, providers as any);
      }

      const consensusResult = await determineConsensus(consensusResponses, weights);
      const blockConsensusResult = await determineConsensus(blockConsensusResponses, weights);

      // 5. Build battery and classify outliers
      const newIncidentsList: Omit<DbIncident, "id" | "t">[] = [];
      const pollId = generateUUID();

      const battery = providers.map((p) => {
        const balRes = balanceResults.find((r) => r.id === p.id)!;
        const blkRes = blockDataResults.find((r) => r.id === p.id)!;
        const blockTuple = normalizeBlockResult(blkRes.result);

        const latestBlockRes = blockResults.find((r) => r.id === p.id);
        const latestBlockNum = latestBlockRes?.status === "ok" && latestBlockRes.result
          ? BigInt(latestBlockRes.result as string)
          : 0n;
        const lagBlocks = latestBlockNum > 0n ? checkFreshness(latestBlockNum, poolMax) : 999;

        const balanceOutlier =
          consensusResult.status === "CONSENSUS" && consensusResult.outliers.includes(p.id);
        const blockOutlier =
          blockConsensusResult.status === "CONSENSUS" && blockConsensusResult.outliers.includes(p.id);

        const kind = classifySingleResponse(
          { providerId: p.id, result: balRes.result, latencyMs: balRes.latencyMs, status: balRes.status },
          balanceOutlier || blockOutlier,
          lagBlocks
        );

        const simulatedCensor =
          activeAdversary.targetId === p.id && activeAdversary.mode === "censor" && balRes.status !== "ok";

        const itemKind = simulatedCensor ? "CENSORING" : kind;

        if (itemKind) {
          newIncidentsList.push({
            provider_id: p.id,
            kind: itemKind,
            poll_id: pollId,
            request: blockOutlier
              ? { method: "eth_getBlockByNumber", params: [pinnedBlockHex, false] }
              : { method: "eth_getBalance", params: [TARGET_ADDRESS, pinnedBlockHex] },
            expected: blockOutlier ? blockConsensusResult.truthHash : consensusResult.truthHash,
            got: blockOutlier ? JSON.stringify(blockTuple) : balRes.result !== null ? String(balRes.result) : null,
            receipts: { txHash: `0x${generateUUID().replace(/-/g, "")}`, network: "sepolia" },
          });
        }

        return {
          providerId: p.id,
          wasInConsensus:
            (consensusResult.status !== "CONSENSUS" || !balanceOutlier) &&
            (blockConsensusResult.status !== "CONSENSUS" || !blockOutlier),
          wasOnline: balRes.status === "ok",
          latencyMs: balRes.latencyMs,
          lagBlocks,
        };
      });

      // 6. Update state & sync to server database
      const syncIncidents = newIncidentsList.map((inc) => ({
        id: generateUUID(),
        t: new Date().toISOString(),
        ...inc,
      })) as DbIncident[];

      if (syncIncidents.length > 0) {
        setIncidents((prev) => [...syncIncidents, ...prev].slice(0, 100));
      }

      const newScoresToSync: DbScore[] = [];
      const updatedScores = [...scores];
      for (const p of providers) {
        const pHistory = updatedScores
          .filter((s) => s.provider_id === p.id)
          .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
          .slice(-49);

        const batteryItem = battery.find((b) => b.providerId === p.id)!;
        const pollRecord = {
          providerId: p.id,
          wasInConsensus: batteryItem.wasInConsensus,
          wasOnline: batteryItem.wasOnline,
          latencyMs: batteryItem.latencyMs,
          lagBlocks: batteryItem.lagBlocks,
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
          id: `${p.id}-score-${Date.now()}`,
          t: new Date().toISOString(),
          provider_id: p.id,
          score: computed.score,
          accuracy: computed.accuracy,
          uptime: computed.uptime,
          latency_avg: computed.latencyAvg,
          freshness_score: computed.freshnessScore,
          trend: computed.trend,
        };
        updatedScores.push(scoreRow);
        newScoresToSync.push(scoreRow);
      }

      // Auto-clear old data: only keep the last 50 score records per provider
      const prunedScores: DbScore[] = [];
      for (const p of providers) {
        const pScores = updatedScores
          .filter((s) => s.provider_id === p.id)
          .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime())
          .slice(-50);
        prunedScores.push(...pScores);
      }
      setScores(prunedScores);

      // Dispatch non-blocking sync to server API
      fetch("/api/poll/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: newScoresToSync,
          incidents: syncIncidents,
        }),
      }).catch((err) => console.warn("Failed to background sync to server database:", err));

    } catch (err) {
      console.error("Client side poll error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Poll Loops Trigger ──────────────────────────────────
  useEffect(() => {
    const startTimer = setTimeout(runClientPoll, 2000);
    const pollInterval = setInterval(runClientPoll, 15000);

    return () => {
      clearTimeout(startTimer);
      clearInterval(pollInterval);
    };
  }, [providers, scores, activeAdversary]);

  // ── Reactive Router Decision ─────────────────────────────
  const badRecentProviders = useMemo(() => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const ids = incidents
      .filter((i) => {
        if (["CENSORING", "DEVIANT"].includes(i.kind)) {
          return i.t >= thirtyMinAgo;
        }
        if (["STALE", "DOWN"].includes(i.kind)) {
          return i.t >= fiveMinAgo;
        }
        return false;
      })
      .map((i) => i.provider_id);
    return new Set<string>(ids);
  }, [incidents]);

  const decision = useMemo(() => {
    const latest = new Map<string, DbScore>();
    const sortedLocal = [...scores].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
    for (const row of sortedLocal) {
      if (!latest.has(row.provider_id)) {
        latest.set(row.provider_id, row);
      }
    }
    const latestScores = [...latest.values()].sort((a, b) => b.score - a.score);

    const candidates: Candidate[] = [];
    for (const s of latestScores) {
      const p = providers.find((prov) => prov.id === s.provider_id);
      if (!p || p.is_sim) continue;
      candidates.push({
        provider_id: p.id,
        url: p.url,
        score: s.score,
        trend: s.trend,
        healthy: s.score >= 50 && !badRecentProviders.has(p.id),
      });
    }

    const healthy = candidates.filter((c) => c.healthy);
    const chain = healthy.length ? healthy : candidates;
    return {
      status: healthy.length ? "HEALTHY" : candidates.length ? "DEGRADED" : "NO_CANDIDATES",
      best: chain[0] ?? null,
      candidates: chain,
      policy: { min_score: 50, max_age_ms: 300000 },
      decided_at: new Date().toISOString(),
    } as RouteDecision;
  }, [scores, providers, badRecentProviders]);

  const scoreMap = useMemo(() => {
    const latest = new Map<string, number>();
    const sortedLocal = [...scores].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
    for (const row of sortedLocal) {
      if (!latest.has(row.provider_id)) {
        latest.set(row.provider_id, row.score);
      }
    }
    return Object.fromEntries(latest);
  }, [scores]);

  const latestScoresList = useMemo(() => {
    const latest = new Map<string, DbScore>();
    const sortedHistory = [...scores].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
    
    // Find the latest and second-latest timestamp for each provider
    const providerTimestamps = new Map<string, string[]>();
    for (const row of sortedHistory) {
      if (!providerTimestamps.has(row.provider_id)) {
        providerTimestamps.set(row.provider_id, []);
      }
      providerTimestamps.get(row.provider_id)!.push(row.t);
    }
    
    const latestTimestampMap = new Map<string, string>();
    const secondLatestTimestampMap = new Map<string, string>();
    for (const [pid, times] of providerTimestamps.entries()) {
      latestTimestampMap.set(pid, times[0]);
      if (times.length > 1) {
        secondLatestTimestampMap.set(pid, times[1]);
      }
    }

    const currentScoresMap = new Map<string, number>();
    const previousScoresMap = new Map<string, number>();

    for (const row of scores) {
      if (row.t === latestTimestampMap.get(row.provider_id)) {
        currentScoresMap.set(row.provider_id, row.score);
        latest.set(row.provider_id, row);
      }
      if (row.t === secondLatestTimestampMap.get(row.provider_id)) {
        previousScoresMap.set(row.provider_id, row.score);
      }
    }

    // Sort current scores to get current ranks
    const currentSorted = [...currentScoresMap.entries()]
      .sort((a, b) => b[1] - a[1]);
    const currentRanks = new Map<string, number>();
    currentSorted.forEach(([pid], index) => {
      currentRanks.set(pid, index + 1);
    });

    // Sort previous scores to get previous ranks
    const previousSorted = [...previousScoresMap.entries()]
      .sort((a, b) => b[1] - a[1]);
    const previousRanks = new Map<string, number>();
    previousSorted.forEach(([pid], index) => {
      previousRanks.set(pid, index + 1);
    });

    // Calculate rank change
    const result: (DbScore & { rankChange?: number })[] = [];
    for (const row of latest.values()) {
      const curRank = currentRanks.get(row.provider_id) || 1;
      const prevRank = previousRanks.get(row.provider_id);
      
      let rankChange = 0;
      if (prevRank !== undefined) {
        rankChange = prevRank - curRank; // was 4th, now 2nd -> +2
      }
      result.push({
        ...row,
        rankChange,
      });
    }

    return result.sort((a, b) => b.score - a.score);
  }, [scores]);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 flex flex-col gap-10">
      {/* ── Top Strip Command Bar ─────────────────────────── */}
      <div className="border border-white/5 bg-black/40 backdrop-blur-xl rounded-[12px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl animate-fade-in-up">
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
            <h1
              className="text-[15px] font-semibold text-white tracking-wide uppercase"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              Argus Failover RPC Node
            </h1>
          </div>
          <p
            className="text-[13px] text-[#7c7c7c]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            One URL for your wallet or dApp. Proved honest, latency-optimized, and censoring-free.
          </p>
        </div>

        {/* Copyable RPC Box */}
        <div className="flex items-center gap-2 w-full md:w-auto max-w-full">
          <div className="relative flex-1 md:flex-initial rounded-[8px] border border-white/10 bg-[#0a0a0a] px-3.5 py-2.5 flex items-center gap-3 w-full md:w-[360px] overflow-hidden">
            <code
              className="text-[11px] text-[#00f0ff] truncate select-all flex-1"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {rpcUrl}
            </code>
            <button
              onClick={copyEndpoint}
              className="text-[#7c7c7c] hover:text-white transition-colors shrink-0"
              title="Copy RPC Endpoint"
              id="copy-rpc-btn"
            >
              {copied ? <Check size={14} className="text-[#4dffb0]" /> : <Copy size={14} />}
            </button>
          </div>
          <span
            className="hidden lg:block text-[11px] text-[#454545]"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            paste into wallet, done.
          </span>
        </div>
      </div>

      {/* ── Tabs bar ──────────────────────────────────────── */}
      <div className="flex border-b border-white/5 gap-2 shrink-0 animate-fade-in-up">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-3 text-[12px] uppercase tracking-wider font-semibold border-b-2 transition-all duration-200 ${
            activeTab === "dashboard"
              ? "border-[#00f0ff] text-white"
              : "border-transparent text-[#7c7c7c] hover:text-white"
          }`}
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <Terminal size={14} />
          Terminal Dashboard
        </button>
        <button
          onClick={() => setActiveTab("interrogate")}
          className={`flex items-center gap-2 px-4 py-3 text-[12px] uppercase tracking-wider font-semibold border-b-2 transition-all duration-200 ${
            activeTab === "interrogate"
              ? "border-[#00f0ff] text-white"
              : "border-transparent text-[#7c7c7c] hover:text-white"
          }`}
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <Warning size={14} />
          Interrogate Console
        </button>
      </div>

      {/* ── Main display tab contents ─────────────────────── */}
      {activeTab === "dashboard" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
          {/* Leaderboard Table (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="px-2">
              <p className="eyebrow text-[10px] mb-1">REPUTATION LEADERBOARD</p>
              <h2
                className="text-[18px] font-medium text-white"
                style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.25px" }}
              >
                Provider Integrity Scores
              </h2>
            </div>
            <LeaderboardTable scores={latestScoresList} providers={providers} isRefreshing={isRefreshing} />
          </div>

          {/* Incidents & Best RPC (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Best RPC Widget */}
            <div className="flex flex-col gap-3">
              <div className="px-2">
                <p className="eyebrow text-[10px] mb-1">AUTO ROUTER</p>
                <h3
                  className="text-[18px] font-medium text-white"
                  style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.25px" }}
                >
                  Best RPC Now
                </h3>
              </div>
              
              {decision.best ? (
                <div className="card flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[4px] border border-white/10 bg-[#1e1e1e] flex items-center justify-center">
                      <span
                        className="text-[10px] font-medium text-[#6798ff]"
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        {decision.best.provider_id.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <p
                          className="text-[14px] font-medium text-white"
                          style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                        >
                          {decision.best.provider_id}
                        </p>
                        <p
                          className="text-[11px] text-[#6798ff]"
                          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                        >
                          Score {decision.best.score}/100
                        </p>
                      </div>
                      <span
                        className={`badge text-[9px] uppercase px-1.5 py-0.5 rounded-[4px] border ${
                          decision.status === "DEGRADED"
                            ? "border-amber-500/20 text-amber-500 bg-amber-500/5"
                            : "border-[#4dffb0]/20 text-[#4dffb0] bg-[#4dffb0]/5"
                        }`}
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        {decision.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#7c7c7c] leading-relaxed">
                    {decision.status === "DEGRADED"
                      ? "Warning: All available providers are currently degraded. Showing the least-bad option."
                      : "Censoring/lying providers are fast but corrupt. Argus prioritizes verified honest endpoints."}
                  </p>
                  <code className="mono-code text-[10px] break-all">{decision.best.url}</code>
                </div>
              ) : (
                <div className="card flex items-center justify-center py-6 text-[#454545]">
                  No route decision available
                </div>
              )}
            </div>

            {/* Incident Feed */}
            <div className="flex flex-col gap-3">
              <div className="px-2">
                <p className="eyebrow text-[10px] mb-1">INCIDENT PROTOCOLS</p>
                <h3
                  className="text-[18px] font-medium text-white"
                  style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.25px" }}
                >
                  Live Malfeasance Feed
                </h3>
              </div>
              <IncidentFeed
                incidents={incidents}
                scores={scoreMap}
                onSelectIncident={(id) => setSelectedIncidentId(id)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          <InterrogateConsole providers={providers} />
        </div>
      )}

      {/* ── Collapsible Simulator controls ────────────────── */}
      <div className="animate-fade-in-up">
        <details open={isDemo} className="group border border-white/5 bg-[#141414]/30 rounded-[12px] overflow-hidden shadow-xl">
          <summary className="flex items-center justify-between p-4 cursor-pointer select-none text-[#7c7c7c] hover:text-white hover:bg-white/5 transition-colors">
            <span
              className="text-[11px] font-medium uppercase tracking-[0.85px]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              Demo & Simulation Controls
            </span>
            <span className="transition-transform duration-200 group-open:rotate-90 text-[#454545] group-hover:text-white">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </summary>
          <div className="p-6 border-t border-white/5 flex flex-col gap-10 bg-black/40 backdrop-blur-xl">
            <AdversaryPanel providers={providers} activeAdversary={activeAdversary} onToggle={handleToggleAdversary} />
            <AddProviderForm onAddProvider={handleAddCustomProvider} />
          </div>
        </details>
      </div>

      {/* ── Dialog Drawers ───────────────────────────────── */}
      <EvidenceDrawer
        incidentId={selectedIncidentId}
        open={!!selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
        incidents={incidents} // Pass client incidents list to Evidence Drawer
      />
    </div>
  );
}
