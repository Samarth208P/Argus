"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Terminal, Warning } from "@phosphor-icons/react";
import { LeaderboardTable } from "./LeaderboardTable";
import { IncidentFeed } from "./IncidentFeed";
import { InterrogateConsole } from "./InterrogateConsole";
import { AdversaryPanel } from "./AdversaryPanel";
import { AddProviderForm } from "./AddProviderForm";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { DbProvider, DbScore, DbIncident } from "@/lib/db/types";
import type { RouteDecision } from "@/lib/engine/router";

interface DashboardContainerProps {
  scores: DbScore[];
  incidents: DbIncident[];
  providers: DbProvider[];
  decision: RouteDecision;
}

export function DashboardContainer({
  scores,
  incidents,
  providers,
  decision,
}: DashboardContainerProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "interrogate">("dashboard");
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://argus.app");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const rpcUrl = `${origin}/api/rpc`;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(rpcUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreMap = Object.fromEntries(scores.map((s) => [s.provider_id, s.score]));

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
            <LeaderboardTable initialScores={scores as any} providers={providers} />
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
                initialIncidents={incidents}
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
        <details className="group border border-white/5 bg-[#141414]/30 rounded-[12px] overflow-hidden shadow-xl">
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
            <AdversaryPanel providers={providers} />
            <AddProviderForm />
          </div>
        </details>
      </div>

      {/* ── Dialog Drawers ───────────────────────────────── */}
      <EvidenceDrawer
        incidentId={selectedIncidentId}
        open={!!selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
      />
    </div>
  );
}
