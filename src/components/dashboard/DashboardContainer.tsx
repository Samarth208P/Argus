"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Copy,
  Check,
  Terminal,
  Warning,
  ShieldCheck,
  Hourglass,
  Cpu,
  Gauge,
  Trophy,
  ArrowUpRight,
  Broadcast,
  Eye,
  EyeSlash,
  Plus
} from "@phosphor-icons/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LeaderboardTable } from "./LeaderboardTable";
import { IncidentFeed } from "./IncidentFeed";
import { InterrogateConsole } from "./InterrogateConsole";
import { AdversaryPanel } from "./AdversaryPanel";
import { AddProviderForm } from "./AddProviderForm";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { DbProvider, DbScore, DbIncident } from "@/lib/db/types";
import type { RouteDecision, Candidate } from "@/lib/engine/router";
import { COLORS, scoreColor } from "@/lib/design-tokens";

// Engine Imports (client-side safe)
import { MAINNET_PROVIDERS, getIndependenceShare } from "@/lib/engine/registry";
import { determineConsensus, extractBlockTuple } from "@/lib/engine/consensus";
import { classifySingleResponse, checkFreshness } from "@/lib/engine/classifier";
import { computeScore } from "@/lib/engine/scorer";
import { fanOutRPC } from "@/lib/engine/poller";

const TARGET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

const PROVIDER_COLORS: Record<string, string> = {
  cloudflare: "#6798ff", // softIndigo
  llama: "#ff6b9d", // pink/rose
  publicnode: "#00f0ff", // cyan
  drpc: "#ffa64d", // amber
  "1rpc": "#4dffb0", // emerald
  blast: "#e0aaff", // purple
  tenderly: "#ccff33", // lime
  onfinality: "#ffc300", // yellow
  flashbots: "#ff5733", // orange-red
  mevblocker: "#9b5de5", // violet
};

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

  // Graph states
  const [activeMetric, setActiveMetric] = useState<"score" | "latency">("score");
  const [visibleProviders, setVisibleProviders] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  // Rotation states
  const [rotationCountdown, setRotationCountdown] = useState("5m 00s");
  const [rotationProgress, setRotationProgress] = useState(100);

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

  // Initialize visible providers on mount
  useEffect(() => {
    setMounted(true);
    const initial: Record<string, boolean> = {};
    for (const p of providers) {
      if (!p.is_sim) {
        initial[p.id] = true;
      }
    }
    setVisibleProviders(initial);
  }, [providers]);

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

  // 5-minute rotation timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const ROTATION_INTERVAL_MS = 5 * 60 * 1000;
      const msPassed = now % ROTATION_INTERVAL_MS;
      const msRemaining = ROTATION_INTERVAL_MS - msPassed;
      
      const minutes = Math.floor(msRemaining / 60000);
      const seconds = Math.floor((msRemaining % 60000) / 1000);
      setRotationCountdown(`${minutes}m ${seconds.toString().padStart(2, "0")}s`);
      setRotationProgress((msRemaining / ROTATION_INTERVAL_MS) * 100);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

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

    // Enable line on graph
    setVisibleProviders((prev) => ({ ...prev, [newProvider.id]: true }));
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

    // Append fallback candidates for unmonitored ones to ensure failover
    const candidateIds = new Set(candidates.map((c) => c.provider_id));
    for (const p of providers) {
      if (p.is_sim) continue;
      if (!candidateIds.has(p.id)) {
        candidates.push({
          provider_id: p.id,
          url: p.url,
          score: 50,
          trend: "STABLE",
          healthy: !badRecentProviders.has(p.id),
        });
      }
    }

    const healthy = candidates.filter((c) => c.healthy);
    let rotatedChain = [...candidates];
    let best: Candidate | null = null;
    const now = Date.now();
    const ROTATION_INTERVAL_MS = 5 * 60 * 1000;
    const currentBucket = Math.floor(now / ROTATION_INTERVAL_MS);

    if (healthy.length > 0) {
      const rotateIndex = currentBucket % healthy.length;
      best = healthy[rotateIndex];
      const healthyCopy = [...healthy];
      const rotatedHealthy = [
        best,
        ...healthyCopy.filter((c) => c.provider_id !== best!.provider_id),
      ];
      const unhealthy = candidates.filter((c) => !c.healthy);
      rotatedChain = [...rotatedHealthy, ...unhealthy];
    } else if (candidates.length > 0) {
      const rotateIndex = currentBucket % candidates.length;
      best = candidates[rotateIndex];
      const candidatesCopy = [...candidates];
      rotatedChain = [
        best,
        ...candidatesCopy.filter((c) => c.provider_id !== best!.provider_id),
      ];
    }

    return {
      status: healthy.length ? "HEALTHY" : candidates.length ? "DEGRADED" : "NO_CANDIDATES",
      best,
      candidates: rotatedChain,
      policy: { min_score: 50, max_age_ms: 300000 },
      decided_at: new Date(now).toISOString(),
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

  // Aligned chart scoring data
  const chartData = useMemo(() => {
    const timeMap = new Map<string, any>();
    
    // Group scores by rounded 15-second interval to align lines properly
    for (const s of scores) {
      const d = new Date(s.t);
      const roundedMs = Math.round(d.getTime() / 15000) * 15000;
      const roundedIso = new Date(roundedMs).toISOString();

      if (!timeMap.has(roundedIso)) {
        timeMap.set(roundedIso, { rawTime: roundedIso });
      }
      const obj = timeMap.get(roundedIso);
      obj[s.provider_id] = s.score;
      obj[`${s.provider_id}_latency`] = s.latency_avg;
    }

    return Array.from(timeMap.values())
      .sort((a, b) => new Date(a.rawTime).getTime() - new Date(b.rawTime).getTime())
      .map((item) => {
        const d = new Date(item.rawTime);
        return {
          ...item,
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      })
      .slice(-15); // Keep last 15 ticks for super clean/compact graph
  }, [scores]);

  const toggleProviderVisibility = (id: string) => {
    setVisibleProviders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getProviderLabel = (id: string) => {
    const found = providers.find((p) => p.id === id);
    return found ? found.label : id;
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6 flex flex-col gap-6">
      
      {/* ── Unified Premium Header ────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5 animate-fade-in-up">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-[#6798ff] font-mono tracking-widest uppercase">
            Argus Telemetry
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-outfit" style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.5px" }}>
            Integrity Monitor
          </h1>
          <p className="text-[13px] text-[#7c7c7c] max-w-[500px]">
            Rotated failover RPC. Verifiable consensus, latency-optimized, and censoring-free.
          </p>
        </div>

        {/* Copyable RPC Box */}
        <div className="flex items-center gap-3">
          <div className="relative rounded-[8px] border border-white/10 bg-[#0a0a0a] px-3.5 py-2 flex items-center gap-3 w-full sm:w-[320px] overflow-hidden">
            <code
              className="text-[11px] text-[#00f0ff] truncate select-all flex-1"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              {rpcUrl}
            </code>
            <button
              onClick={copyEndpoint}
              className="text-[#7c7c7c] hover:text-white transition-colors shrink-0 p-1"
              title="Copy RPC Endpoint"
              id="copy-rpc-btn"
            >
              {copied ? <Check size={13} className="text-[#4dffb0]" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Telemetry Stats Grid (Minimal & Borderless) ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2 border-b border-white/5 animate-fade-in-up">
        {/* Rotation */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-[#454545] uppercase tracking-wider font-semibold font-mono">Next Rotation</span>
            <span className="text-[18px] font-bold text-white font-mono">{rotationCountdown}</span>
          </div>
          <div className="relative h-8 w-8 flex items-center justify-center shrink-0">
            <svg className="absolute w-7 h-7 -rotate-90">
              <circle cx="14" cy="14" r="12" className="stroke-white/5" strokeWidth="1.5" fill="transparent" />
              <circle cx="14" cy="14" r="12" className="stroke-[#00f0ff] transition-all duration-1000" strokeWidth="1.5" fill="transparent" strokeDasharray={2*Math.PI*12} strokeDashoffset={2*Math.PI*12*(1 - rotationProgress/100)} />
            </svg>
            <Hourglass size={12} className="text-[#00f0ff]" />
          </div>
        </div>

        {/* Active Node */}
        <div className="flex items-center justify-between border-l border-white/5 pl-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-[#454545] uppercase tracking-wider font-semibold font-mono">Best RPC Node</span>
            <span className="text-[17px] font-bold text-white tracking-tight truncate max-w-[130px]">{decision.best ? getProviderLabel(decision.best.provider_id) : "..."}</span>
          </div>
          <Cpu size={16} className="text-[#4dffb0]" />
        </div>

        {/* Consensus */}
        <div className="flex items-center justify-between border-l border-white/5 pl-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-[#454545] uppercase tracking-wider font-semibold font-mono">Consensus State</span>
            <span className="text-[17px] font-bold text-white tracking-tight">{decision.status === "HEALTHY" ? "Healthy" : "Degraded"}</span>
          </div>
          <ShieldCheck size={16} className="text-[#6798ff]" />
        </div>

        {/* Active Monitored */}
        <div className="flex items-center justify-between border-l border-white/5 pl-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-[#454545] uppercase tracking-wider font-semibold font-mono">Monitored Sets</span>
            <span className="text-[17px] font-bold text-white tracking-tight">{providers.filter(p=>!p.is_sim).length} Nodes</span>
          </div>
          <Gauge size={16} className="text-[#ffa64d]" />
        </div>
      </div>

      {/* ── Tabs bar ──────────────────────────────────────── */}
      <div className="flex border-b border-white/5 gap-4 shrink-0 animate-fade-in-up">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 pb-2 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-all duration-200 ${
            activeTab === "dashboard"
              ? "border-[#00f0ff] text-white"
              : "border-transparent text-[#7c7c7c] hover:text-white"
          }`}
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <Terminal size={12} />
          Terminal
        </button>
        <button
          onClick={() => setActiveTab("interrogate")}
          className={`flex items-center gap-2 pb-2 text-[11px] uppercase tracking-widest font-bold border-b-2 transition-all duration-200 ${
            activeTab === "interrogate"
              ? "border-[#00f0ff] text-white"
              : "border-transparent text-[#7c7c7c] hover:text-white"
          }`}
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          <Warning size={12} />
          Interrogate
        </button>
      </div>

      {/* ── Main display tab contents ─────────────────────── */}
      {activeTab === "dashboard" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
          {/* Left Panel: Analytics Graph & Leaderboard (col-span-8) */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Live Analytics Graph (Borderless & Sleek) */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[9px] text-[#7c7c7c] uppercase tracking-wider font-semibold font-mono">Performance Stream</span>
                  <h2 className="text-[15px] font-bold text-white font-outfit" style={{ fontFamily: "var(--font-outfit)" }}>
                    Telemetry Stream History
                  </h2>
                </div>
                
                {/* Metric Selector */}
                <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-full p-0.5">
                  <button
                    onClick={() => setActiveMetric("score")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                      activeMetric === "score"
                        ? "bg-white/[0.08] text-white"
                        : "text-[#7c7c7c] hover:text-white"
                    }`}
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    Reputation
                  </button>
                  <button
                    onClick={() => setActiveMetric("latency")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                      activeMetric === "latency"
                        ? "bg-white/[0.08] text-white"
                        : "text-[#7c7c7c] hover:text-white"
                    }`}
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    Latency
                  </button>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-[200px] w-full relative">
                {!mounted ? (
                  <div className="h-full w-full bg-black/20 border border-white/5 rounded-[8px] flex items-center justify-center text-xs text-[#454545] animate-pulse">
                    AWAITING TELEMETRY SYNC...
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full w-full bg-black/20 border border-white/5 rounded-[8px] flex items-center justify-center text-xs text-[#454545]">
                    NO SUFFICIENT SCORE HISTORY FOUND
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#454545"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      />
                      <YAxis
                        domain={activeMetric === "score" ? [0, 100] : [0, "auto"]}
                        stroke="#454545"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                        ticks={activeMetric === "score" ? [0, 25, 50, 75, 100] : undefined}
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#0c0c0e",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 8,
                          fontSize: 11,
                          fontFamily: "var(--font-jetbrains-mono)",
                          color: "#ffffff",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                        }}
                        labelFormatter={(label) => `Timestamp: ${label}`}
                        formatter={(value: unknown, name: any) => {
                          const pLabel = getProviderLabel(String(name));
                          return [`${Math.round(Number(value ?? 0))}${activeMetric === "score" ? "" : " ms"}`, pLabel];
                        }}
                      />
                      {providers
                        .filter((p) => !p.is_sim && visibleProviders[p.id])
                        .map((p) => {
                          const color = PROVIDER_COLORS[p.id] || "#ffffff";
                          return (
                            <Line
                              key={p.id}
                              type="monotone"
                              dataKey={activeMetric === "score" ? p.id : `${p.id}_latency`}
                              stroke={color}
                              strokeWidth={1.5}
                              dot={false}
                              activeDot={{ r: 4, strokeWidth: 0 }}
                              name={p.id}
                            />
                          );
                        })}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Interactive Legends pills */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                {providers
                  .filter((p) => !p.is_sim)
                  .map((p) => {
                    const active = visibleProviders[p.id];
                    const color = PROVIDER_COLORS[p.id] || "#ffffff";
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProviderVisibility(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${
                          active
                            ? "bg-white/[0.04] text-white border-white/10"
                            : "bg-transparent text-[#454545] border-transparent hover:text-white/60"
                        }`}
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: active ? color : "#454545" }}
                        />
                        {p.label}
                        {active ? <Eye size={10} className="ml-0.5 text-[#7c7c7c]" /> : <EyeSlash size={10} className="ml-0.5" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Reputation Leaderboard */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[9px] text-[#7c7c7c] uppercase tracking-wider font-semibold font-mono">Consensus Rank</span>
                <h2
                  className="text-[15px] font-bold text-white font-outfit"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  Provider Integrity Scores
                </h2>
              </div>
              <LeaderboardTable scores={latestScoresList} providers={providers} isRefreshing={isRefreshing} />
            </div>

          </div>

          {/* Right Panel: Auto Router Info & Malfeasance Feed (col-span-4) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            
            {/* Auto Router Panel */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[9px] text-[#7c7c7c] uppercase tracking-wider font-semibold font-mono">Auto Router</span>
                <h3
                  className="text-[15px] font-bold text-white font-outfit"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  Routing State
                </h3>
              </div>
              
              {decision.best ? (
                <div className="flex flex-col gap-4">
                  {/* Summary row */}
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_COLORS[decision.best.provider_id] || "#6798ff" }} />
                      <span className="text-[14px] font-semibold text-white font-inter">
                        {getProviderLabel(decision.best.provider_id)}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#00f0ff] bg-[#00f0ff]/5 border border-[#00f0ff]/20 px-2 py-0.5 rounded-[4px]">
                      {decision.best.score} pts
                    </span>
                  </div>

                  {/* Single-line failover chain flow */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-[#454545] font-semibold font-mono">Failover Path</span>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-[#7c7c7c]">
                      {decision.candidates.slice(0, 3).map((cand, idx) => (
                        <div key={cand.provider_id} className="flex items-center gap-1.5">
                          <span className={idx === 0 ? "text-white font-bold" : "text-[#454545]"}>
                            {getProviderLabel(cand.provider_id).split(" ")[0]}
                          </span>
                          {idx < 2 && idx < decision.candidates.length - 1 && (
                            <span className="text-[#313131]">➔</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#454545]">No routing decision</div>
              )}
            </div>

            {/* Incident Feed */}
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-[9px] text-[#7c7c7c] uppercase tracking-wider font-semibold font-mono">Incident Feed</span>
                <h3
                  className="text-[15px] font-bold text-white font-outfit"
                  style={{ fontFamily: "var(--font-outfit)" }}
                >
                  Live Malfeasance Log
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
        incidents={incidents}
      />
    </div>
  );
}
