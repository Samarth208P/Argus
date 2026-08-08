"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  Broadcast,
  MagnifyingGlass,
  ShieldCheck,
  Path,
  ArrowRight,
  CheckCircle,
  Warning,
  Clock,
  ShieldSlash,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/* ── Per-feature miniature visuals ────────────────────────── */

function MonitorVisual() {
  const nodes = [55, 45, 70, 120, 88, 195, 240, 310];
  return (
    <VisualFrame label="poller · 20s cadence">
      <div className="grid grid-cols-4 gap-2">
        {nodes.map((lat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="rounded-[8px] border border-white/8 bg-[#0e0e10] p-2.5"
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3] live-dot" />
              <span className="text-[9px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>node {i + 1}</span>
            </div>
            <p className="text-[13px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{lat}<span className="text-[10px] text-[#54545a]">ms</span></p>
          </motion.div>
        ))}
      </div>
    </VisualFrame>
  );
}

function DetectVisual() {
  const rows = [
    { icon: Warning, kind: "DEVIANT", who: "returned a forked balance", cls: "badge-deviant", c: "#ff6b6b" },
    { icon: Clock, kind: "STALE", who: "served a 14s-old block", cls: "badge-stale", c: "#ffbf59" },
    { icon: ShieldSlash, kind: "CENSORING", who: "dropped a Tornado tx", cls: "badge-censoring", c: "#6798ff" },
  ];
  return (
    <VisualFrame label="consensus diff engine">
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <motion.div
            key={r.kind}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="flex items-center gap-3 rounded-[8px] border border-white/8 bg-[#0e0e10] px-3 py-2.5"
          >
            <r.icon size={15} color={r.c} weight="fill" />
            <span className={r.cls}>{r.kind}</span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>{r.who}</span>
          </motion.div>
        ))}
      </div>
    </VisualFrame>
  );
}

function ProveVisual() {
  return (
    <VisualFrame label="evidence bundle · sha-256">
      <div className="rounded-[8px] border border-white/8 bg-[#0e0e10] p-3">
        <div className="flex flex-col gap-2 text-[11px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
          {[
            ["pinnedBlock", "0x14e2f1a"],
            ["consensusHash", "9f3c…a71b"],
            ["merkleRoot", "0x7bd2…e4c9"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
              <span className="text-[#7c7c82]">{k}</span>
              <span className="text-[#6798ff]">{v}</span>
            </div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mt-3 flex items-center gap-2 rounded-[7px] border border-[#57d9a3]/22 bg-[#57d9a3]/[0.06] px-2.5 py-2"
        >
          <CheckCircle size={14} weight="fill" color="#57d9a3" />
          <span className="text-[11px] text-[#7fe3c0]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>committed to Sepolia · block 6,204,881</span>
        </motion.div>
      </div>
    </VisualFrame>
  );
}

function RouteVisual() {
  const opts = [
    { n: "Flashbots Protect", s: 99, best: true },
    { n: "Cloudflare", s: 98 },
    { n: "OnFinality", s: 62 },
  ];
  return (
    <VisualFrame label="integrity-first router">
      <div className="flex flex-col gap-2">
        {opts.map((o, i) => (
          <motion.div
            key={o.n}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`flex items-center gap-3 rounded-[8px] border px-3 py-2.5 ${
              o.best ? "border-[#6798ff]/35 bg-[#6798ff]/[0.06]" : "border-white/8 bg-[#0e0e10]"
            }`}
          >
            <Path size={14} color={o.best ? "#6798ff" : "#54545a"} weight={o.best ? "bold" : "regular"} />
            <span className="flex-1 text-[12px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{o.n}</span>
            <span className="text-[12px] font-semibold tnum" style={{ color: o.s >= 80 ? "#6798ff" : "#ffbf59", fontFamily: "var(--font-inter)" }}>{o.s}</span>
            {o.best && <span className="badge-ok">routed</span>}
          </motion.div>
        ))}
      </div>
    </VisualFrame>
  );
}

function VisualFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-white/8 bg-[#111114] p-3.5 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)]">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff]" />
        <span className="text-[10px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

const FEATURES = [
  {
    n: "01",
    tag: "Collect",
    icon: Broadcast,
    title: "Watch every provider, continuously.",
    body: "Argus polls each registered RPC every 20 seconds against pinned blocks and identical requests — building a live, side-by-side record of exactly what each node claims is true.",
    cta: "See the live monitor",
    href: "/#leaderboard",
    Visual: MonitorVisual,
  },
  {
    n: "02",
    tag: "Understand",
    icon: MagnifyingGlass,
    title: "Catch the lie the moment it happens.",
    body: "Isomorphic consensus math compares every response. When one node deviates from the weighted majority — stale data, mutated state, a censored transaction — it surfaces instantly, classified by fault type.",
    cta: "Read the incident feed",
    href: "/#live-feed",
    Visual: DetectVisual,
  },
  {
    n: "03",
    tag: "Prove",
    icon: ShieldCheck,
    title: "Evidence anyone can verify.",
    body: "Every detection ships a signed evidence bundle — the request, the responses, the consensus hash — Merkle-committed on-chain. Recompute it in your own browser and check it against the commitment. No trust required.",
    cta: "Verify a claim",
    href: "/verify",
    Visual: ProveVisual,
  },
  {
    n: "04",
    tag: "Act",
    icon: Path,
    title: "Always route to honest endpoints.",
    body: "Integrity scores feed a router that prefers verified-honest nodes over merely fast ones. Censoring providers are quick — and dishonest. Argus sends your traffic where the truth is.",
    cta: "Explore auto-routing",
    href: "/#leaderboard",
    Visual: RouteVisual,
  },
];

export function FeatureStory() {
  const reduce = useReducedMotion();
  return (
    <section id="how" className="section" aria-label="How Argus works">
      <div className="container-page">
        <SectionHeading
          eyebrow="The pipeline"
          title="From raw responses to on-chain proof."
          description="Four stages turn eight noisy RPC endpoints into a single, verifiable source of truth about who is honest right now."
          className="mb-20 max-w-[720px]"
        />

        <div className="flex flex-col gap-24 md:gap-32">
          {FEATURES.map((f, i) => {
            const flip = i % 2 === 1;
            return (
              <div key={f.n} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16">
                {/* Copy */}
                <Reveal className={flip ? "md:order-2" : ""}>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-[#6798ff] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{f.n}</span>
                    <span className="h-px w-8 bg-white/12" />
                    <span className="text-[11px] uppercase tracking-[1.5px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{f.tag}</span>
                  </div>
                  <h3 className="mt-5 max-w-[15ch] text-balance text-[clamp(26px,3.4vw,38px)] font-medium leading-[1.08] tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-inter)" }}>
                    {f.title}
                  </h3>
                  <p className="mt-4 max-w-[46ch] text-[17px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}>
                    {f.body}
                  </p>
                  <Link href={f.href} className="group mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-white transition-colors hover:text-[#6798ff]">
                    {f.cta}
                    <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Reveal>

                {/* Visual */}
                <motion.div
                  {...(reduce
                    ? {}
                    : {
                        initial: { opacity: 0, y: 24 },
                        whileInView: { opacity: 1, y: 0 },
                        viewport: { once: true, margin: "-80px" },
                        transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] },
                      })}
                  className={flip ? "md:order-1" : ""}
                >
                  <f.Visual />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
