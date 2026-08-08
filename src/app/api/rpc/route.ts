import { NextResponse } from "next/server";
import { selectRoute } from "@/lib/engine/router";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return rpcErr(-32700, "Parse error");
  }
  if (!parsed?.method) return rpcErr(-32600, "Invalid Request");

  try {
    const { candidates, status } = await selectRoute();
    // Try the top 3 candidates as a failover chain
    for (const c of candidates.slice(0, 3)) {
      try {
        const res = await fetch(c.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) continue;
        const text = await res.text();
        return new Response(text, {
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "x-argus-routed-to": c.provider_id,
            "x-argus-route-status": status.toLowerCase(),
          },
        });
      } catch {
        // upstream failed or timed out — try next candidate
      }
    }
    return rpcErr(-32000, "No reachable upstream provider");
  } catch (err) {
    return rpcErr(-32603, "Internal JSON-RPC error: " + String(err));
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function rpcErr(code: number, message: string) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code, message } },
    {
      headers: {
        "access-control-allow-origin": "*",
      },
    }
  );
}
