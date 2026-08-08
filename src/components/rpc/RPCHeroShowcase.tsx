"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { providerLabel } from "@/lib/rpc";
import type { useLiveScores } from "./useLiveScores";
import { CurrentBestRPC } from "./CurrentBestRPC";
import { RPCComparisonChart } from "./RPCComparisonChart";

type LiveScores = ReturnType<typeof useLiveScores>;

export function RPCHeroShowcase({ live }: { live: LiveScores }) {
  const { ranked, best, advantage, lastUpdated, isRefreshing, series } = live;

  const labelFor = (id: string) => {
    const r = ranked.find((x) => x.provider_id === id);
    return r ? providerLabel(r) : id;
  };

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0c0c0e] shadow-[0_50px_120px_-50px_rgba(0,0,0,0.9)]">
      <div className="grid grid-cols-1 gap-px bg-white/[0.06] lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Best RPC */}
        <div className="bg-[#0c0c0e] p-4 sm:p-5">
          <CurrentBestRPC best={best} advantage={advantage} lastUpdated={lastUpdated} refreshing={isRefreshing} />
        </div>

        {/* Comparison chart */}
        <div className="bg-[#0c0c0e] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[1.4px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                RPC performance comparison
              </p>
              <p className="mt-0.5 text-[15px] font-medium text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.3px" }}>
                Every provider, side by side
              </p>
            </div>
          </div>
          <RPCComparisonChart series={series} labelFor={labelFor} />
        </div>
      </div>

      {/* CTA strip */}
      <div className="flex flex-col items-start justify-between gap-3 border-t border-white/8 bg-[#0e0e11] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="text-[13.5px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
          Ranked continuously from live consensus — {ranked.length} providers monitored right now.
        </p>
        <Link
          href="/rpcs"
          className="group inline-flex items-center gap-1.5 text-[13.5px] font-medium text-white transition-colors hover:text-[#6798ff]"
        >
          Explore all RPCs
          <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
