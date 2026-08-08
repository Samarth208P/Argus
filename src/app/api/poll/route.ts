import { NextRequest, NextResponse } from "next/server";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";
import { determineConsensus } from "@/lib/engine/consensus";
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
import { verifyBlockContinuity } from "@/lib/engine/continuityWatch";
import { sendCensorshipProbe } from "@/lib/engine/censorshipProbe";


export const dynamic = "force-dynamic";
// Max 60s for a full poll cycle
export const maxDuration = 60;

const TIMEOUT_MS = 3000;
const MIN_PARTICIPATION = 5;

// ── Validate cron secret ──────────────────────────────────
function validateCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode — no secret required
  const auth = req.headers.get("x-cron-secret") ?? req.headers.get("authorization");
  return auth === secret || auth === `Bearer ${secret}`;
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


export async function POST(req: NextRequest) {
  if (!validateCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const poolMax = blockNumbers.reduce((a, b) => (b > a ? b : a), 0n);

    // Use poolMax - 10 as the pinned "finalized" approximation
    const pinnedBlock = poolMax > 10n ? poolMax - 10n : poolMax;
    const pinnedBlockHex = "0x" + pinnedBlock.toString(16);

    // ── C1: eth_getBalance (state honesty) ───────────────
    const TARGET_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth
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

    // Build independence weights
    const weights: Record<string, number> = {};
    for (const p of allProviders) {
      weights[p.id] = getIndependenceShare(p.id, allProviders as any);
    }

    // ── Run consensus ────────────────────────────────────
    const consensusResult = await determineConsensus(consensusResponses, weights);

    // ── Build battery ─────────────────────────────────────
    const battery = allProviders.map((p) => {
      const balRes = balanceResults.find((r) => r.id === p.id)!;
      const blkRes = blockDataResults.find((r) => r.id === p.id)!;
      const lagBlocks = blkRes.result
        ? checkFreshness(
            BigInt((blkRes.result as Record<string, string>)?.number ?? "0x0"),
            poolMax
          )
        : 999;

      const isOutlier = consensusResult.outliers.includes(p.id);
      const kind = classifySingleResponse(
        { providerId: p.id, result: balRes.result, latencyMs: balRes.latencyMs, status: balRes.status },
        isOutlier,
        lagBlocks
      );

      return {
        providerId: p.id,
        balance: balRes.result,
        latencyMs: balRes.latencyMs,
        status: balRes.status,
        lagBlocks,
        kind,
        isOutlier,
      };
    });

    // ── Persist poll ──────────────────────────────────────
    let pollId: string | null = null;
    try {
      pollId = await insertPoll({
        battery,
        pinned_block_hex: pinnedBlockHex,
        consensus_hash: consensusResult.truthHash,
        merkle_root: null,
        status: consensusResult.status,
      });
    } catch { /* DB not connected */ }

    // ── Persist incidents for confirmed outliers ──────────
    const incidents: string[] = [];
    for (const item of battery) {
      if (item.kind && item.kind !== "DOWN") {
        try {
          // Log on-chain first to get the tx hash (attestation receipt)
          const txHash = await logIncidentOnChain(pollId ?? "00000000-0000-0000-0000-000000000000", item.kind, item.providerId);
          const receipts = txHash ? { txHash, network: "sepolia" } : null;

          const incidentId = await insertIncident({
            provider_id: item.providerId,
            kind: item.kind,
            poll_id: pollId,
            request: { method: "eth_getBalance", params: [TARGET_ADDRESS, pinnedBlockHex] },
            expected: consensusResult.truthHash,
            got: item.balance !== null ? String(item.balance) : null,
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
          wasInConsensus: consensusResult.truthGroup.includes(p.id),
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

    return NextResponse.json({
      ok: true,
      pinnedBlockHex,
      pollId,
      consensus: consensusResult.status,
      truthHash: consensusResult.truthHash,
      outliers: consensusResult.outliers,
      incidents,
      providersPolled: allProviders.length,
    });
  } catch (err) {
    console.error("[/api/poll]", err);
    return NextResponse.json({ error: "Poll failed", detail: String(err) }, { status: 500 });
  }
}
