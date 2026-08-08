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
    let lastErrorPayload: string | null = null;
    let lastErrorProvider: string | null = null;

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
        let payload = text;
        let isJsonRpcError = false;

        try {
          const json = JSON.parse(text);
          if (json && typeof json === "object" && !Array.isArray(json)) {
            if (json.error) {
              isJsonRpcError = true;
              lastErrorPayload = text;
              lastErrorProvider = c.provider_id;
            } else {
              json.argus_routed_to = c.provider_id;
              json.argus_route_status = status.toLowerCase();
              payload = JSON.stringify(json);
            }
          }
        } catch {}

        if (isJsonRpcError) {
          continue; // Try next provider in the chain
        }

        return new Response(payload, {
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

    if (lastErrorPayload) {
      // If all candidates failed but at least one returned a JSON-RPC error, return it
      try {
        const json = JSON.parse(lastErrorPayload);
        if (json && typeof json === "object" && !Array.isArray(json)) {
          json.argus_routed_to = lastErrorProvider;
          json.argus_route_status = "degraded";
          lastErrorPayload = JSON.stringify(json);
        }
      } catch {}
      return new Response(lastErrorPayload, {
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
          "x-argus-routed-to": lastErrorProvider || "unknown",
          "x-argus-route-status": "degraded",
        },
      });
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
