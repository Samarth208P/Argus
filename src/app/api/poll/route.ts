import { NextRequest, NextResponse } from "next/server";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";
import { canonicalize, determineConsensus, extractBlockTuple } from "@/lib/engine/consensus";
import { classifySingleResponse, checkFreshness } from "@/lib/engine/classifier";
import { computeScore } from "@/lib/engine/scorer";
import { getIndependenceShare } from "@/lib/engine/registry";
import {
  insertPoll,
  insertIncident,
  upsertScore,
  getScoreHistory,
  getProviders,
} from "@/lib/db/queries";
import { logIncidentOnChain } from "@/lib/engine/attestationWriter";
import { getAdversaryState } from "@/lib/engine/adversaryState";
import { fanOutRPC } from "@/lib/engine/poller";
import { processPendingMerkleRoots } from "@/lib/engine/merkle";


export const dynamic = "force-dynamic";
// Max 60s for a full poll cycle
export const maxDuration = 60;

const TIMEOUT_MS = 3000;
const MIN_PARTICIPATION = 5;
const TARGET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

// ── Validate cron secret ──────────────────────────────────
function validateCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — no secret required
  const auth = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
  return auth === secret || auth === `Bearer ${secret}`;
}

function validateDbConfig() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length === 0) return null;
  return `Missing required Supabase env vars: ${missing.join(", ")}`;
}

// ── Fan out to all active providers ──────────────────────
async function fanOut(
  providers: { id: string; url: string }[],
  method: string,
  params: unknown[]
) {
  return fanOutRPC(providers, method, params, (providerId, m, result) => {
    const adv = getAdversaryState();
    if (adv.targetId === providerId && adv.mode) {
      if (adv.mode === "censor") {
        return { result: null, status: "error" };
      }
      if (adv.mode === "mutate" && m === "eth_getBalance") {
        return { result: "0x0" };
      }
      if (adv.mode === "stale" && m === "eth_blockNumber" && result) {
        const num = BigInt(result as string);
        return { result: "0x" + (num > 5n ? num - 5n : 0n).toString(16) };
      }
      if (adv.mode === "stale" && m === "eth_getBlockByNumber" && result && typeof result === "object") {
        const blockObj = { ...(result as Record<string, unknown>) };
        if (blockObj.number) {
          const num = BigInt(blockObj.number as string);
          blockObj.number = "0x" + (num > 5n ? num - 5n : 0n).toString(16);
        }
        return { result: blockObj };
      }
    }
    return { result };
  });
}

function normalizeBlockResult(result: unknown) {
  if (!result || typeof result !== "object") return null;
  return extractBlockTuple(result as Record<string, string>);
}

async function retryConfirmsDeviation(
  provider: { id: string; url: string },
  method: string,
  params: unknown[],
  expectedHash: string,
  normalize: (value: unknown) => unknown = (value) => value
) {
  for (let i = 0; i < 2; i++) {
    const [retry] = await fanOut([provider], method, params);
    if (retry?.status !== "ok") continue;
    const retryHash = await canonicalize(normalize(retry.result));
    if (retryHash === expectedHash) return false;
  }
  return true;
}


export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbConfigError = validateDbConfig();
  if (dbConfigError) {
    console.error(dbConfigError);
    return NextResponse.json({ error: "DB_CONFIG_MISSING", detail: dbConfigError }, { status: 500 });
  }

  try {
    // Get active providers (built-ins + any custom ones from DB)
    let dbProviders: Awaited<ReturnType<typeof getProviders>> = [];
    try { dbProviders = await getProviders(); } catch { /* DB not connected */ }

    // Merge built-ins with DB providers (DB wins on conflict)
    const builtInIds = new Set(dbProviders.map((p) => p.id));
    const allProviders = [
      ...dbProviders,
      ...MAINNET_PROVIDERS.filter((p) => !builtInIds.has(p.id)).map((p) => ({
        id: p.id, url: p.url, label: p.label, operator: p.operator,
        type: p.type, is_sim: false, network: p.network, created_at: new Date().toISOString(),
      })),
    ].filter((p) => !p.is_sim);

    if (allProviders.length < MIN_PARTICIPATION) {
      return NextResponse.json({ error: "Not enough providers" }, { status: 400 });
    }

    // ── C4: Resolve finalized block number ──────────────
    const blockResults = await fanOut(allProviders, "eth_blockNumber", []);
    const blockNumbers = blockResults
      .filter((r) => r.status === "ok" && r.result)
      .map((r) => BigInt(r.result as string));
    if (blockNumbers.length < MIN_PARTICIPATION) {
      return NextResponse.json(
        { error: "Not enough live providers", liveProviders: blockNumbers.length },
        { status: 503 }
      );
    }
    const poolMax = blockNumbers.reduce((a, b) => (b > a ? b : a), 0n);

    // Use poolMax - 10 as the pinned "finalized" approximation
    const pinnedBlock = poolMax > 10n ? poolMax - 10n : poolMax;
    const pinnedBlockHex = "0x" + pinnedBlock.toString(16);

    // ── C1: eth_getBalance (state honesty) ───────────────
    const balanceResults = await fanOut(allProviders, "eth_getBalance", [
      TARGET_ADDRESS,
      pinnedBlockHex,
    ]);

    // ── C2: eth_getBlockByNumber (block honesty) ─────────
    const blockDataResults = await fanOut(allProviders, "eth_getBlockByNumber", [
      pinnedBlockHex,
      false,
    ]);

    // ── Build consensus responses ─────────────────────────
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

    // Build independence weights
    const weights: Record<string, number> = {};
    for (const p of allProviders) {
      weights[p.id] = getIndependenceShare(p.id, allProviders as any);
    }

    // ── Run consensus ────────────────────────────────────
    const consensusResult = await determineConsensus(consensusResponses, weights);
    const blockConsensusResult = await determineConsensus(blockConsensusResponses, weights);

    // ── Build battery ─────────────────────────────────────
    const battery = allProviders.map((p) => {
      const balRes = balanceResults.find((r) => r.id === p.id)!;
      const blkRes = blockDataResults.find((r) => r.id === p.id)!;
      const blockTuple = normalizeBlockResult(blkRes.result);
      const latestBlockRes = blockResults.find((r) => r.id === p.id);
      const latestBlockNum = latestBlockRes?.status === "ok" && latestBlockRes.result
        ? BigInt(latestBlockRes.result as string)
        : 0n;
      const lagBlocks = latestBlockNum > 0n
        ? checkFreshness(latestBlockNum, poolMax)
        : 999;

      const balanceOutlier =
        consensusResult.status === "CONSENSUS" && consensusResult.outliers.includes(p.id);
      const blockOutlier =
        blockConsensusResult.status === "CONSENSUS" && blockConsensusResult.outliers.includes(p.id);
      const adv = getAdversaryState();
      const kind = classifySingleResponse(
        { providerId: p.id, result: balRes.result, latencyMs: balRes.latencyMs, status: balRes.status },
        balanceOutlier || blockOutlier,
        lagBlocks
      );
      const simulatedCensor =
        adv.targetId === p.id && adv.mode === "censor" && balRes.status !== "ok";

      return {
        providerId: p.id,
        balance: balRes.result,
        block: blockTuple,
        latencyMs: balRes.latencyMs,
        status: balRes.status,
        lagBlocks,
        kind: simulatedCensor ? "CENSORING" : kind,
        isOutlier: balanceOutlier || blockOutlier,
        balanceOutlier,
        blockOutlier,
        deviationCheck: blockOutlier ? "block" : balanceOutlier ? "balance" : null,
      };
    });

    // ── Persist poll ──────────────────────────────────────
    let pollId: string;
    try {
      pollId = await insertPoll({
        battery,
        pinned_block_hex: pinnedBlockHex,
        consensus_hash: consensusResult.truthHash,
        merkle_root: null,
        status:
          consensusResult.status === "CONSENSUS" && blockConsensusResult.status === "CONSENSUS"
            ? "ok"
            : "INCONCLUSIVE",
      });
    } catch (err) {
      console.error("Failed to insert poll:", err);
      return NextResponse.json(
        {
          ok: false,
          error: "DB_INSERT_FAILED",
          detail: String(err),
          consensus: consensusResult.status,
          blockConsensus: blockConsensusResult.status,
          providersPolled: allProviders.length,
        },
        { status: 503 }
      );
    }

    // ── Persist incidents for confirmed outliers ──────────
    const incidents: string[] = [];
    for (const item of battery) {
      if (item.kind) {
        try {
          if (item.kind === "DEVIANT") {
            const provider = allProviders.find((p) => p.id === item.providerId);
            const expectedHash =
              item.deviationCheck === "block"
                ? blockConsensusResult.truthHash
                : consensusResult.truthHash;
            if (!provider || !expectedHash) continue;

            const confirmed = await retryConfirmsDeviation(
              provider,
              item.deviationCheck === "block" ? "eth_getBlockByNumber" : "eth_getBalance",
              item.deviationCheck === "block"
                ? [pinnedBlockHex, false]
                : [TARGET_ADDRESS, pinnedBlockHex],
              expectedHash,
              item.deviationCheck === "block" ? normalizeBlockResult : (value) => value
            );
            if (!confirmed) continue;
          }

          // Log on-chain first to get the tx hash (attestation receipt)
          const txHash = await logIncidentOnChain(pollId, item.kind, item.providerId);
          const receipts = txHash ? { txHash, network: "sepolia" } : null;
          const expected =
            item.deviationCheck === "block"
              ? blockConsensusResult.truthHash
              : consensusResult.truthHash;

          const incidentId = await insertIncident({
            provider_id: item.providerId,
            kind: item.kind,
            poll_id: pollId,
            request:
              item.deviationCheck === "block"
                ? { method: "eth_getBlockByNumber", params: [pinnedBlockHex, false] }
                : { method: "eth_getBalance", params: [TARGET_ADDRESS, pinnedBlockHex] },
            expected,
            got:
              item.deviationCheck === "block"
                ? JSON.stringify(item.block)
                : item.balance !== null ? String(item.balance) : null,
            receipts,
          });
          incidents.push(incidentId);
        } catch (err) {
          console.error("Failed to insert incident:", err);
        }
      }
    }

    // ── Update scores ─────────────────────────────────────
    for (const p of allProviders) {
      try {
        const history = await getScoreHistory(p.id, 50);
        const batteryItem = battery.find((b) => b.providerId === p.id);
        const pollRecord = {
          providerId: p.id,
          wasInConsensus:
            (consensusResult.status !== "CONSENSUS" || consensusResult.truthGroup.includes(p.id)) &&
            (blockConsensusResult.status !== "CONSENSUS" || blockConsensusResult.truthGroup.includes(p.id)),
          wasOnline: batteryItem?.status === "ok",
          latencyMs: batteryItem?.latencyMs ?? TIMEOUT_MS,
          lagBlocks: batteryItem?.lagBlocks ?? 999,
        };

        const existing = history.map((h) => ({
          providerId: h.provider_id,
          wasInConsensus: h.accuracy > 0.5,
          wasOnline: h.uptime > 0.5,
          latencyMs: h.latency_avg,
          lagBlocks: h.freshness_score > 0.5 ? 0 : 3,
        }));

        const score = computeScore([...existing, pollRecord]);
        await upsertScore({
          provider_id: p.id,
          score: score.score,
          accuracy: score.accuracy,
          uptime: score.uptime,
          latency_avg: score.latencyAvg,
          freshness_score: score.freshnessScore,
          trend: score.trend,
        });
      } catch { /* DB not connected */ }
    }

    // ── Hourly Merkle Notarization ────────────────────────
    try {
      await processPendingMerkleRoots();
    } catch (merkleErr) {
      console.error("Failed to process hourly Merkle roots:", merkleErr);
    }

    return NextResponse.json({
      ok: true,
      pinnedBlockHex,
      pollId,
      consensus: consensusResult.status,
      blockConsensus: blockConsensusResult.status,
      truthHash: consensusResult.truthHash,
      outliers: [...new Set([...consensusResult.outliers, ...blockConsensusResult.outliers])],
      incidents,
      providersPolled: allProviders.length,
    });
  } catch (err) {
    console.error("[/api/poll]", err);
    return NextResponse.json({ error: "Poll failed", detail: String(err) }, { status: 500 });
  }
}
