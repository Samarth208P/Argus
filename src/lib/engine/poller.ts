// ============================================================
// Core Polling Module — PRD F-01
// Runs parallel queries to multiple RPC endpoints with a 3s timeout
// ============================================================

const TIMEOUT_MS = 3000;

export interface RPCResponse {
  id: string;
  result: unknown;
  latencyMs: number;
  status: "ok" | "timeout" | "error";
}

export async function fanOutRPC(
  providers: { id: string; url: string }[],
  method: string,
  params: unknown[],
  interceptFn?: (providerId: string, method: string, result: unknown) => { result: unknown; status?: "ok" | "timeout" | "error" }
): Promise<RPCResponse[]> {
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const start = Date.now();
      try {
        const res = await fetch(p.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          signal: controller.signal,
        });
        const json = await res.json();
        let result = json.result ?? null;
        let status: "ok" | "timeout" | "error" = "ok";

        if (interceptFn) {
          const intercepted = interceptFn(p.id, method, result);
          result = intercepted.result;
          if (intercepted.status) {
            status = intercepted.status;
          }
        }

        if (status === "error") {
          throw new Error("Simulated interception error");
        }

        return {
          id: p.id,
          result,
          latencyMs: Date.now() - start,
          status,
        };
      } catch (e) {
        const isTimeout = e instanceof Error && e.name === "AbortError";
        return {
          id: p.id,
          result: null,
          latencyMs: Date.now() - start,
          status: isTimeout ? ("timeout" as const) : ("error" as const),
        };
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { id: providers[i].id, result: null, latencyMs: TIMEOUT_MS, status: "error" as const }
  );
}
