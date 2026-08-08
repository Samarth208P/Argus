import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RPCLeaderboard } from "@/components/rpc/RPCLeaderboard";
import { RPCMonitoringPanel } from "@/components/rpc/RPCMonitoringPanel";
import { getLatestScores, getProviders, getRecentIncidents } from "@/lib/db/queries";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "RPC Leaderboard — Argus",
  description: "Compare every Ethereum RPC provider by verifiable integrity, latency, accuracy and uptime — ranked in real time.",
};

export default async function RpcsPage() {
  let scores: Awaited<ReturnType<typeof getLatestScores>> = [];
  let providers: Awaited<ReturnType<typeof getProviders>> = [];
  let incidents: Awaited<ReturnType<typeof getRecentIncidents>> = [];
  try {
    [scores, providers, incidents] = await Promise.all([
      getLatestScores(),
      getProviders(),
      getRecentIncidents(50),
    ]);
  } catch {
    /* fall back to empty */
  }

  const scoreMap = Object.fromEntries(scores.map((s) => [s.provider_id, s.score]));

  return (
    <>
      <Navbar />
      <main role="main" className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] aurora opacity-60" />

        <div className="container-page pt-[112px] pb-20 sm:pt-[144px]">
          {/* Header */}
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
            <ArrowLeft size={13} /> Back to overview
          </Link>
          <p className="eyebrow mb-3">RPC Leaderboard</p>
          <h1 className="max-w-[20ch] text-balance text-[clamp(32px,5vw,56px)] font-medium leading-[1.03] tracking-[-0.04em] text-white" style={{ fontFamily: "var(--font-inter)" }}>
            Every RPC, ranked in real time.
          </h1>
          <p className="mt-5 max-w-[62ch] text-[18px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
            Integrity scores are computed from live consensus. Sort by any metric, filter by network or type,
            and watch rankings physically reorder as the data changes.
          </p>

          {/* Leaderboard */}
          <div className="mt-12">
            <RPCLeaderboard initialScores={scores} providers={providers} />
          </div>

          <RPCMonitoringPanel incidents={incidents} providers={providers} scoreMap={scoreMap} />
        </div>
      </main>
      <Footer />
    </>
  );
}
