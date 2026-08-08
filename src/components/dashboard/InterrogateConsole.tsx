"use client";

import { useState } from "react";
import { Play, Spinner, CheckCircle, Warning } from "@phosphor-icons/react";
import type { DbProvider } from "@/lib/db/types";

interface InterrogateConsoleProps {
  providers: DbProvider[];
}

export function InterrogateConsole({ providers }: InterrogateConsoleProps) {
  const [method, setMethod] = useState("eth_getBalance");
  const [paramsStr, setParamsStr] = useState('["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]');
  const [blockHex, setBlockHex] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInterrogate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    let params: unknown[] = [];
    try {
      if (paramsStr.trim()) {
        params = JSON.parse(paramsStr);
        if (!Array.isArray(params)) throw new Error("Parameters must be a JSON array");
      }
    } catch (err: any) {
      setError(`Invalid parameters format: ${err.message}. Example: ["0x...", "latest"]`);
      setLoading(false);
      return;
    }

    try {
      // Map to correct API payload
      const payloadProviders = providers
        .filter((p) => !p.is_sim)
        .map((p) => ({ id: p.id, url: p.url }));

      const res = await fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: payloadProviders,
          method,
          params,
          blockHex: blockHex.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? "Failed to run interrogation query");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Network error running query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Console form */}
      <form onSubmit={handleInterrogate} className="card flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* RPC Method */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rpc-method-input" className="eyebrow text-[10px]">
              RPC METHOD
            </label>
            <input
              id="rpc-method-input"
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              placeholder="eth_getBalance"
              className="rounded-[8px] border border-white/5 bg-[#0a0a0a] px-3.5 py-2 text-[13px] text-white focus:border-[#6798ff] outline-none"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              required
            />
          </div>

          {/* Block parameter */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rpc-block-input" className="eyebrow text-[10px]">
              PINNED BLOCK NUMBER (optional)
            </label>
            <input
              id="rpc-block-input"
              type="text"
              value={blockHex}
              onChange={(e) => setBlockHex(e.target.value)}
              placeholder="0x127bcf8"
              className="rounded-[8px] border border-white/5 bg-[#0a0a0a] px-3.5 py-2 text-[13px] text-white focus:border-[#6798ff] outline-none"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            />
          </div>

          {/* Action button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
              id="run-interrogate-btn"
            >
              {loading ? (
                <>
                  <Spinner size={14} className="animate-spin" />
                  Quorum querying...
                </>
              ) : (
                <>
                  <Play size={13} weight="fill" />
                  Execute Interrogation
                </>
              )}
            </button>
          </div>
        </div>

        {/* JSON Params */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rpc-params-input" className="eyebrow text-[10px]">
            METHOD PARAMETERS (JSON Array)
          </label>
          <textarea
            id="rpc-params-input"
            value={paramsStr}
            onChange={(e) => setParamsStr(e.target.value)}
            rows={2}
            className="rounded-[8px] border border-white/5 bg-[#0a0a0a] px-3.5 py-2 text-[13px] text-white focus:border-[#6798ff] outline-none font-mono resize-none leading-normal"
            required
          />
        </div>

        {error && (
          <p className="text-[12px] text-red-400" style={{ fontFamily: "var(--font-inter)" }}>
            {error}
          </p>
        )}
      </form>

      {/* Results details */}
      {result && (
        <div className="flex flex-col gap-5 animate-fade-in-up">
          {/* Consensus highlight banner */}
          <div className="card border border-white/5 bg-black/40 backdrop-blur-xl p-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-[#4dffb0]" />
              <span
                className="text-[12px] uppercase tracking-wider font-semibold"
                style={{ fontFamily: "var(--font-jetbrains-mono)", color: "#4dffb0" }}
              >
                Consensus Verdict: {result.consensus.status}
              </span>
            </div>
            <p className="eyebrow text-[10px] text-[#454545]">TRUTH HASH</p>
            <code
              className="text-[12px] text-white break-all font-mono"
              title="Winning consensus hash"
            >
              {result.consensus.truthHash ?? "INCONCLUSIVE / NO_CONSENSUS"}
            </code>
          </div>

          {/* Detailed results by provider */}
          <div className="flex flex-col gap-2">
            <p className="eyebrow px-2">Provider Responses ({result.responses.length})</p>
            <div className="flex flex-col gap-1">
              {result.responses.map((res: any) => {
                const isOutlier = result.consensus.outliers.includes(res.providerId);
                const isWinner = result.consensus.truthGroup.includes(res.providerId);
                const isDown = res.status !== "ok";

                // Visual coding border classes
                const statusBorderClass = isWinner
                  ? "border-[#1a4030] bg-[#0f2a1f]/20 hover:border-green-500/30"
                  : isOutlier
                  ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
                  : "border-white/5 bg-black/20 hover:border-white/10";

                return (
                  <div
                    key={res.providerId}
                    className={`rounded-[12px] border px-5 py-4 flex flex-col gap-3 transition-all duration-200 ${statusBorderClass}`}
                  >
                    {/* Provider info bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[14px] font-medium text-white"
                          style={{ fontFamily: "var(--font-outfit)" }}
                        >
                          {res.providerId}
                        </span>
                        <span
                          className="text-[11px] text-[#454545]"
                          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                        >
                          {res.latencyMs}ms
                        </span>
                      </div>

                      {/* Status chips */}
                      <div>
                        {isWinner && (
                          <span
                            className="badge text-[9px] uppercase border border-green-500/30 text-green-400 bg-green-500/5 px-2 py-0.5 rounded-[4px]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            Consensus Match
                          </span>
                        )}
                        {isOutlier && !isDown && (
                          <span
                            className="badge text-[9px] uppercase border border-red-500/30 text-red-400 bg-red-500/5 px-2 py-0.5 rounded-[4px]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            Deviant Outlier
                          </span>
                        )}
                        {isDown && (
                          <span
                            className="badge text-[9px] uppercase border border-white/10 text-[#7c7c7c] bg-white/5 px-2 py-0.5 rounded-[4px]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            {res.error || "Offline"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Result payload */}
                    {!isDown && (
                      <div className="rounded-[8px] border border-white/5 bg-black/40 p-3">
                        <pre className="text-[11px] text-[#7c7c7c] break-all whitespace-pre-wrap font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                          {JSON.stringify(res.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
