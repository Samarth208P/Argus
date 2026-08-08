"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react";
import { ProductPreview } from "./ProductPreview";

export function HeroSection() {
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
    <section id="hero" aria-label="Argus hero" className="relative overflow-hidden pt-36 pb-20 sm:pt-44">
      {/* Ambient background — subtle, masked, purposeful */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-bg fade-mask opacity-70" />
        <div className="absolute inset-x-0 top-0 h-[560px] aurora" />
      </div>

      <div className="container-page">
        {/* Eyebrow pill */}
        <motion.div {...entry(0)} className="mb-7 flex">
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff] live-dot" />
            Censorship-resistance monitoring, live on mainnet
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...entry(0.06)}
          className="max-w-[15ch] text-balance text-[clamp(44px,7.4vw,84px)] font-medium leading-[0.98] tracking-[-0.045em] text-white"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Every Ethereum RPC,{" "}
          <span className="text-gradient">cross-examined.</span>
        </motion.h1>

        {/* Supporting copy + CTAs */}
        <div className="mt-8 grid grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <motion.p
            {...entry(0.14)}
            className="max-w-[560px] text-pretty text-[18px] leading-[1.6] text-[#a5a5ac]"
            style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}
          >
            Argus continuously interrogates every RPC provider, catches stale data,
            mutated state and censored transactions the moment they happen — and
            publishes cryptographic receipts anyone can verify.
          </motion.p>

          <motion.div {...entry(0.2)} className="flex flex-wrap items-center gap-3">
            <Link href="/terminal" className="btn-primary">
              Open the terminal
              <ArrowRight size={16} weight="bold" />
            </Link>
            <Link href="/verify" className="btn-ghost">
              <ShieldCheck size={16} />
              Verify evidence
            </Link>
          </motion.div>
        </div>

        {/* Product preview */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.28 },
              })}
          className="relative mt-16 sm:mt-20"
        >
          {/* Soft glow under the app */}
          <div aria-hidden className="pointer-events-none absolute -inset-x-8 -top-8 bottom-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(103,152,255,0.12),transparent_70%)]" />
          <ProductPreview />
        </motion.div>
      </div>
    </section>
  );
}
