"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, ArrowRight, Lightning } from "@phosphor-icons/react";
import { providerLabel, type RankedRPC } from "@/lib/rpc";

/**
 * The RPC endpoint Argus provides: a single drop-in URL (/api/rpc) that
 * routes every call to the current best provider with automatic failover.
 * `best` is passed in from the SAME useLiveScores instance that drives the
 * best-performing card, so "Routing to" always matches it with no lag.
 */
export function ArgusEndpointCard({ best }: { best: RankedRPC | null }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin || "https://argus.live"}/api/rpc`;
  const routedLabel = best ? providerLabel(best) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-white/10 bg-gradient-to-b from-[#121215] to-[#0e0e11] p-5">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(103,152,255,0.16),transparent_70%)]" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[1.4px] text-[#9db8ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <Lightning size={13} weight="fill" color="#6798ff" /> Drop-in RPC endpoint
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3] live-dot" /> Live
          </span>
        </div>

        <p className="mb-4 text-[13.5px] leading-[1.55] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
          Point any wallet or app here. Argus routes every call to the current best-performing provider — with automatic failover.
        </p>

        {/* Copyable endpoint */}
        <button
          onClick={copy}
          className="group flex w-full items-center gap-2 rounded-[10px] border border-white/10 bg-[#0a0a0b] px-3 py-3 text-left transition-colors hover:border-[#6798ff]/40"
          aria-label="Copy Argus RPC endpoint"
        >
          <code className="min-w-0 flex-1 truncate text-[13px] text-[#e7e7e5]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            {endpoint}
          </code>
          <span className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12px] font-medium transition-colors ${copied ? "text-[#57d9a3]" : "text-[#a5a5ac] group-hover:text-white"}`} style={{ fontFamily: "var(--font-inter)" }}>
            {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>

        {/* Routed provider — same source as the best-performing card */}
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
          {routedLabel ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3]" />
              Routing to <span className="font-medium text-white">{routedLabel}</span>
            </span>
          ) : (
            <span className="text-[12.5px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>Integrity-first routing</span>
          )}
          <Link href="/rpcs" className="group inline-flex items-center gap-1 text-[12.5px] font-medium text-[#6798ff] transition-colors hover:text-white">
            View RPCs
            <ArrowRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
