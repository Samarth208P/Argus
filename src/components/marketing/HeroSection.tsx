"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Trophy } from "@phosphor-icons/react";
import type { DbScore, DbProvider } from "@/lib/db/types";
import { RPCHeroShowcase } from "@/components/rpc/RPCHeroShowcase";
import { ArgusEndpointCard } from "@/components/rpc/ArgusEndpointCard";

export function HeroSection({
  initialScores,
  providers,
  initialRows,
}: {
  initialScores: DbScore[];
  providers: DbProvider[];
  initialRows?: DbScore[];
}) {
  const reduce = useReducedMotion();
  const entry = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] as const, delay },
        };

  return (
    <section id="hero" aria-label="Argus hero" className="relative overflow-hidden pt-36 pb-16 sm:pt-44 lg:pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg fade-mask opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[520px] aurora" />
      </div>

      <div className="container-page">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          {/* Left: headline block */}
          <div className="flex flex-col">
            <motion.div {...entry(0)} className="mb-6 flex">
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff] live-dot" />
                Real-time RPC intelligence · live on mainnet
              </span>
            </motion.div>

            <motion.h1
              {...entry(0.06)}
              className="max-w-[15ch] text-balance text-[clamp(40px,6vw,70px)] font-medium leading-[1.0] tracking-[-0.045em] text-white"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Find the fastest, most honest{" "}
              <span className="text-gradient">Ethereum RPC.</span>
            </motion.h1>

            <motion.p
              {...entry(0.14)}
              className="mt-7 max-w-[540px] text-pretty text-[18px] leading-[1.6] text-[#a5a5ac]"
              style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}
            >
              Argus cross-examines every provider against live consensus, ranks them by
              verifiable integrity, and shows you exactly which endpoint to trust right now.
            </motion.p>

            <motion.div {...entry(0.2)} className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/rpcs" className="btn-primary">
                <Trophy size={16} weight="fill" />
                Explore all RPCs
              </Link>
              <Link href="/verify" className="btn-ghost">
                Verify evidence
                <ArrowRight size={16} weight="bold" />
              </Link>
            </motion.div>
          </div>

          {/* Right: copyable Argus RPC endpoint */}
          <motion.div {...entry(0.26)} className="w-full lg:mt-12">
            <ArgusEndpointCard providers={providers} />
          </motion.div>
        </div>

        {/* Live RPC showcase — the hero visual */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.28 },
              })}
          className="relative mt-14 sm:mt-16"
        >
          <div aria-hidden className="pointer-events-none absolute -inset-x-8 -top-8 bottom-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(103,152,255,0.12),transparent_70%)]" />
          <RPCHeroShowcase initialScores={initialScores} providers={providers} initialRows={initialRows} />
        </motion.div>
      </div>
    </section>
  );
}
