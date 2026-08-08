"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck, Sparkle, LinkSimple, ArrowRight } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";

const FINDINGS = [
  {
    id: "stale",
    rank: "01",
    label: "Stale blocks",
    pct: 42,
    detail: "3 providers served block heights behind consensus",
    color: "#ffbf59",
    sources: ["Poll #48,201 · 14s drift", "Receipt 0x14e2…f1a", "6 / 7 nodes agree"],
  },
  {
    id: "latency",
    rank: "02",
    label: "Latency spikes",
    pct: 27,
    detail: "2 providers exceeded the 250ms freshness budget",
    color: "#6798ff",
    sources: ["Poll #48,197 · p95 410ms", "Receipt 0x9b3c…d02", "Router de-weighted"],
  },
  {
    id: "censor",
    rank: "03",
    label: "Transaction censorship",
    pct: 18,
    detail: "1 provider silently dropped a compliant transaction",
    color: "#ff6b6b",
    sources: ["Probe #2,041 · tx omitted", "Receipt 0x7bd2…e4c9", "Merkle root committed"],
  },
];

export function EvidenceSection() {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const active = FINDINGS.find((f) => f.id === hover) ?? FINDINGS[0];

  return (
    <section aria-label="Grounded verdicts" className="section">
      <div className="container-page">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          {/* Copy */}
          <div>
            <Reveal as="p" className="eyebrow" >
              <span style={{ color: "#6798ff" }}>Grounded, not guessed</span>
            </Reveal>
            <Reveal as="h2" delay={1} className="mt-4 max-w-[16ch] text-balance text-[clamp(30px,4.4vw,50px)] font-medium leading-[1.05] tracking-[-0.035em] text-white">
              Every verdict traces back to evidence.
            </Reveal>
            <Reveal as="p" delay={2} className="mt-5 max-w-[48ch] text-[18px] leading-[1.6] text-[#a5a5ac]">
              Argus never asks you to take its word for it. Each finding is
              stitched to the exact polls, receipts and on-chain commitments that
              produced it. Hover a theme to trace it to source.
            </Reveal>
            <Reveal delay={3}>
              <a href="/verify" className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium text-white transition-colors hover:text-[#6798ff]">
                Recompute it yourself
                <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
              </a>
            </Reveal>
          </div>

          {/* Evidence panel */}
          <Reveal delay={1}>
            <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#0f0f12] shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
              {/* Query bar */}
              <div className="border-b border-white/8 bg-[#111114] p-4">
                <div className="flex items-center gap-2.5 rounded-[10px] border border-white/8 bg-[#0a0a0b] px-3.5 py-3">
                  <Sparkle size={16} weight="fill" color="#6798ff" />
                  <span className="text-[14px] text-[#e7e7e5]" style={{ fontFamily: "var(--font-inter)" }}>
                    Which providers broke consensus in the last hour?
                  </span>
                </div>
                <p className="mt-2.5 flex items-center gap-2 px-1 text-[11px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3]" />
                  Cross-examined 8 providers · 1,204 responses
                </p>
              </div>

              {/* Findings */}
              <div className="p-3">
                {FINDINGS.map((f, i) => (
                  <motion.button
                    key={f.id}
                    onMouseEnter={() => setHover(f.id)}
                    onFocus={() => setHover(f.id)}
                    initial={reduce ? undefined : { opacity: 0, y: 8 }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className={`flex w-full items-center gap-3.5 rounded-[11px] px-3 py-3 text-left transition-colors ${
                      active.id === f.id ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="text-[12px] font-medium text-[#54545a] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{f.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{f.label}</span>
                        <span className="shrink-0 text-[13px] font-semibold tnum" style={{ color: f.color, fontFamily: "var(--font-inter)" }}>{f.pct}%</span>
                      </span>
                      <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-white/8">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: f.color }}
                          initial={reduce ? undefined : { width: 0 }}
                          whileInView={reduce ? undefined : { width: `${f.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Verdict + sources */}
              <div className="border-t border-white/8 bg-[#111114] p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={14} weight="fill" color="#6798ff" />
                  <span className="text-[10px] uppercase tracking-[1.2px] text-[#9db8ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{active.label} · sources</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {active.sources.map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-[8px] border border-white/8 bg-[#0a0a0b] px-2.5 py-2 text-[11.5px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                      <LinkSimple size={12} color="#6798ff" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
