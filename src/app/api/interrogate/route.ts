import { NextRequest, NextResponse } from "next/server";
import { determineConsensus } from "@/lib/engine/consensus";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

export async function POST(req: NextRequest) {
  let body: {
    providers: Array<{ id: string; url: string }>;
    method: string;
    params?: unknown[];
    blockHex?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { providers, method, params = [], blockHex } = body;

  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return NextResponse.json({ error: "Missing or invalid providers list" }, { status: 400 });
  }

  if (!method) {
    return NextResponse.json({ error: "Missing RPC method" }, { status: 400 });
  }

  // Parse params and append blockHex if needed
  let rpcParams = [...params];
  if (blockHex) {
    rpcParams.push(blockHex);
  }

  try {
    // Fan out to selected providers
    const okResponses = await Promise.all(
      providers.map(async (p) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const start = Date.now();
        try {
          const res = await fetch(p.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method,
              params: rpcParams,
            }),
            signal: controller.signal,
          });
          const json = await res.json();
          return {
            providerId: p.id,
            result: json.result ?? null,
            error: json.error ? String(json.error.message || json.error) : undefined,
            latencyMs: Date.now() - start,
            status: "ok" as const,
          };
        } catch (err) {
          const isTimeout = err instanceof Error && err.name === "AbortError";
          return {
            providerId: p.id,
            result: null,
            error: isTimeout ? "TIMEOUT" : "CONNECTION_ERROR",
            latencyMs: Date.now() - start,
            status: isTimeout ? ("timeout" as const) : ("error" as const),
          };
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    // Calculate consensus weights (equal weights for ad-hoc interrogation)
    const weights: Record<string, number> = {};
    providers.forEach((p) => {
      weights[p.id] = 1;
    });

    // Determine consensus on the results
    const consensusResult = await determineConsensus(okResponses, weights);

    return NextResponse.json({
      method,
      params: rpcParams,
      responses: okResponses,
      consensus: consensusResult,
    });
  } catch (err) {
    console.error("[/api/interrogate]", err);
    return NextResponse.json({ error: "Interrogation failed", detail: String(err) }, { status: 500 });
  }
}
