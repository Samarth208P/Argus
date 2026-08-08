"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Gauge,
  Trophy,
  Broadcast,
  ShieldCheck,
  Path,
  ArrowUp,
  ArrowDown,
  Minus,
  Warning,
  CheckCircle,
  Circle,
} from "@phosphor-icons/react";

/* Static, believable sample data — mirrors the real dashboard shape. */
const ROWS = [
  { id: "flashbots", label: "Flashbots Protect", type: "relay", score: 99, latency: 55, trend: "up" as const },
  { id: "cloudflare", label: "Cloudflare", type: "node", score: 98, latency: 45, trend: "stable" as const },
  { id: "mevblocker", label: "MEV Blocker", type: "relay", score: 97, latency: 70, trend: "up" as const },
  { id: "llama", label: "LlamaNodes", type: "aggregator", score: 95, latency: 120, trend: "stable" as const },
  { id: "onfinality", label: "OnFinality", type: "node", score: 62, latency: 310, trend: "down" as const },
];

const SPARK = [58, 60, 63, 61, 66, 70, 74, 79, 84, 88, 92, 90, 94];

function scoreColor(s: number) {
  if (s >= 80) return "#6798ff";
  if (s >= 50) return "#ffbf59";
  return "#ff6b6b";
}

const TrendIcon = { up: ArrowUp, down: ArrowDown, stable: Minus };
const trendColor = { up: "#57d9a3", down: "#ff6b6b", stable: "#7c7c82" };

export function ProductPreview() {
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, margin: "-60px" },
          transition: { delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] as const },
        };

  return (
    <div className="relative">
      {/* App window */}
      <div className="overflow-hidden rounded-[16px] border border-white/10 bg-[#0d0d0f] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.02)]">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-[#111114] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#2a2a30]" />
            <span className="h-3 w-3 rounded-full bg-[#2a2a30]" />
            <span className="h-3 w-3 rounded-full bg-[#2a2a30]" />
          </div>
          <div className="mx-auto flex h-6 items-center gap-2 rounded-[7px] border border-white/8 bg-white/[0.02] px-3 text-[11px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3]" />
            argus.live/monitor
          </div>
        </div>

        {/* App body */}
        <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[168px_1fr]">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-1 border-r border-white/8 bg-[#0e0e10] p-3 sm:flex">
            <div className="mb-3 flex items-center gap-2 px-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#6798ff]" fill="currentColor" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z" /></svg>
              <span className="text-[13px] font-semibold text-white">Argus</span>
            </div>
            {[
              { icon: Gauge, label: "Monitor", active: true },
              { icon: Trophy, label: "Leaderboard" },
              { icon: Broadcast, label: "Incidents" },
              { icon: ShieldCheck, label: "Verify" },
              { icon: Path, label: "Auto Router" },
            ].map((n) => (
              <div
                key={n.label}
                className={`flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] ${
                  n.active ? "bg-white/[0.06] text-white" : "text-[#7c7c82]"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <n.icon size={15} weight={n.active ? "bold" : "regular"} color={n.active ? "#6798ff" : undefined} />
                {n.label}
              </div>
            ))}
          </aside>

          {/* Sidebar (collapsed, mobile) */}
          <aside className="flex flex-col items-center gap-3 border-r border-white/8 bg-[#0e0e10] py-3 sm:hidden">
            {[Gauge, Trophy, Broadcast, ShieldCheck, Path].map((Icon, i) => (
              <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-[8px] ${i === 0 ? "bg-white/[0.06] text-[#6798ff]" : "text-[#54545a]"}`}>
                <Icon size={15} weight={i === 0 ? "bold" : "regular"} />
              </span>
            ))}
          </aside>

          {/* Main */}
          <div className="min-w-0 p-3 sm:p-4">
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-white sm:text-[15px]" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.3px" }}>
                  Live Monitor
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff] live-dot" /> Refreshes every 20s
                </p>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              {[
                { k: "Honest nodes", v: "7 / 8", accent: "#57d9a3" },
                { k: "Incidents · 24h", v: "3", accent: "#ffbf59" },
                { k: "Consensus", v: "100%", accent: "#6798ff" },
              ].map((s, i) => (
                <motion.div key={s.k} {...rise(0.1 + i * 0.06)} className="rounded-[10px] border border-white/8 bg-[#111114] p-2.5 sm:p-3">
                  <p className="mb-1.5 text-[9px] uppercase tracking-[0.8px] text-[#7c7c82] sm:text-[10px]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{s.k}</p>
                  <p className="text-[16px] font-semibold text-white tnum sm:text-[20px]" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.6px" }}>
                    <span style={{ color: s.accent }}>{s.v}</span>
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.35fr_1fr]">
              {/* Leaderboard table */}
              <motion.div {...rise(0.28)} className="overflow-hidden rounded-[10px] border border-white/8 bg-[#111114]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-white/8 px-3 py-2 text-[9px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  <span>Provider</span><span className="text-right">Score</span><span className="w-10 text-right">Lat</span>
                </div>
                {ROWS.map((r, i) => {
                  const T = TrendIcon[r.trend];
                  return (
                    <motion.div
                      key={r.id}
                      {...(reduce
                        ? {}
                        : {
                            initial: { opacity: 0, x: -6 },
                            whileInView: { opacity: 1, x: 0 },
                            viewport: { once: true },
                            transition: { delay: 0.34 + i * 0.07, duration: 0.4 },
                          })}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-white/[0.05] px-3 py-2 last:border-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-white/8 bg-white/[0.03] text-[9px] font-medium text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                          {r.label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{r.label}</span>
                          <span className="block text-[10px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{r.type}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="hidden h-1 w-14 overflow-hidden rounded-full bg-white/8 sm:block">
                          <motion.div
                            initial={reduce ? undefined : { width: 0 }}
                            whileInView={reduce ? undefined : { width: `${r.score}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5 + i * 0.07, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                            className="h-full rounded-full"
                            style={{ background: scoreColor(r.score) }}
                          />
                        </div>
                        <span className="w-6 text-right text-[12px] font-semibold tnum" style={{ color: scoreColor(r.score), fontFamily: "var(--font-inter)" }}>{r.score}</span>
                        <T size={11} color={trendColor[r.trend]} />
                      </div>
                      <span className="w-10 text-right text-[11px] text-[#a5a5ac] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{r.latency}ms</span>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Evidence / verdict card */}
              <motion.div {...rise(0.4)} className="flex flex-col gap-3">
                <div className="rounded-[10px] border border-white/8 bg-[#111114] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Consensus · 30d</p>
                    <span className="text-[11px] font-medium text-[#57d9a3] tnum">+4.2%</span>
                  </div>
                  <Sparkline />
                </div>

                <div className="rounded-[10px] border border-[#6798ff]/22 bg-[#6798ff]/[0.05] p-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <ShieldCheck size={13} weight="fill" color="#6798ff" />
                    <p className="text-[9px] uppercase tracking-[0.8px] text-[#9db8ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Verdict · grounded</p>
                  </div>
                  <p className="mb-2.5 text-[12px] leading-[1.5] text-[#e7e7e5]" style={{ fontFamily: "var(--font-inter)" }}>
                    OnFinality served a block <span className="text-white">14s stale</span> against 7-node consensus.
                  </p>
                  <div className="flex flex-col gap-1">
                    {["Receipt · block 0x14e2f1a", "6 / 7 nodes agree", "Merkle root committed"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5 text-[10.5px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                        <CheckCircle size={11} weight="fill" color="#57d9a3" /> {s}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating incident toast */}
      {!reduce && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute -bottom-5 right-3 hidden items-center gap-2.5 rounded-[11px] border border-white/10 bg-[#141416]/95 px-3.5 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:flex"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#ffbf59]/12">
            <Warning size={14} weight="fill" color="#ffbf59" />
          </span>
          <div>
            <p className="text-[12px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>Stale block detected</p>
            <p className="text-[10.5px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>OnFinality · evidence pinned</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Sparkline() {
  const max = Math.max(...SPARK);
  const min = Math.min(...SPARK);
  const w = 200;
  const h = 44;
  const pts = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="pp-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6798ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6798ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pp-spark)" />
      <motion.path
        d={d}
        fill="none"
        stroke="#6798ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.5 }}
      />
    </svg>
  );
}
