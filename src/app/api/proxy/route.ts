import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 3000;

// Server-side RPC proxy — bypasses browser CORS restrictions entirely
export async function POST(req: NextRequest) {
  let body: { url: string; method: string; params?: unknown[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, method, params = [] } = body;

  if (!url || !method) {
    return NextResponse.json(
      { error: "Missing required fields: url, method" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const start = Date.now();
  try {
    const rpcRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - start;
    const json = await rpcRes.json();

    return NextResponse.json({ result: json.result, error: json.error, latencyMs });
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
        latencyMs,
      },
      { status: isTimeout ? 408 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
