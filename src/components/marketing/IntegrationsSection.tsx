"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Cube,
  Broadcast,
  Cloud,
  Lightning,
  Globe,
  Database,
  ChatCircle,
  PlugsConnected,
} from "@phosphor-icons/react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const GREEN = "#57d9a3";
const BLUE = "#6798ff";
const DEMO_ROTATION_MS = 2400;

type DemoNode = {
  id: string;
  label: string;
  icon: typeof Cloud;
  pos: { x: number; y: number };
};

const DEMO_NODES: DemoNode[] = [
  { id: "cloudflare", label: "Cloudflare", icon: Cloud, pos: { x: 72, y: 64 } },
  { id: "flashbots", label: "Flashbots", icon: Lightning, pos: { x: 72, y: 210 } },
  { id: "llama", label: "LlamaNodes", icon: Database, pos: { x: 72, y: 356 } },
  { id: "publicnode", label: "PublicNode", icon: Globe, pos: { x: 520, y: 64 } },
  { id: "drpc", label: "dRPC", icon: Cube, pos: { x: 526, y: 210 } },
  { id: "tenderly", label: "Tenderly", icon: Broadcast, pos: { x: 520, y: 356 } },
  { id: "onfinality", label: "OnFinality", icon: PlugsConnected, pos: { x: 396, y: 42 } },
  { id: "sepolia", label: "Sepolia", icon: ChatCircle, pos: { x: 396, y: 378 } },
];

const HUB = { x: 300, y: 210 };

function pathTo(x: number, y: number) {
  const mx = (HUB.x + x) / 2;
  return `M${x},${y} Q${mx},${y} ${mx},${(y + HUB.y) / 2} T${HUB.x},${HUB.y}`;
}

export function IntegrationsSection() {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % DEMO_NODES.length);
    }, DEMO_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const activeNode = DEMO_NODES[activeIndex];

  return (
    <section aria-label="Live routing network" className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="Live routing"
          title="All RPCs stay connected. The best one lights up."
          description="This is a demo network: every RPC connects into the center block, and the active provider shifts green while the others stay blue."
          align="center"
          className="mx-auto mb-10 max-w-[720px]"
        />

        <Reveal className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <LegendDot color={GREEN} label={`Best RPC · ${activeNode.label}`} pulse />
          <LegendDot color={BLUE} label="Monitored" />
        </Reveal>

        <Reveal className="mx-auto max-w-[860px]">
          <div className="relative overflow-hidden rounded-[20px] border border-white/8 bg-[#0d0d0f] p-4 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 dot-bg opacity-40" />
            <svg viewBox="0 0 600 420" className="relative w-full" role="img" aria-label="Argus routing network demo">
              <defs>
                <linearGradient id="int-green" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.05" />
                  <stop offset="50%" stopColor={GREEN} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="int-blue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={BLUE} stopOpacity="0.04" />
                  <stop offset="50%" stopColor={BLUE} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={BLUE} stopOpacity="0.04" />
                </linearGradient>
              </defs>

              {/* Provider connection lines */}
              {DEMO_NODES.map((n, i) => {
                const isBest = n.id === activeNode.id;
                return (
                  <motion.path
                    key={`pline-${n.id}`}
                    d={pathTo(n.pos.x, n.pos.y)}
                    fill="none"
                    stroke={isBest ? "url(#int-green)" : "url(#int-blue)"}
                    strokeWidth={isBest ? 2.4 : 1.1}
                    style={{ transition: "stroke-width 0.45s ease, stroke 0.45s ease" }}
                    initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
                    whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.9, ease: "easeOut" }}
                  />
                );
              })}

              {/* Traveling pulses */}
              {!reduce &&
                DEMO_NODES.map((n, i) => {
                  const isBest = n.id === activeNode.id;
                  return (
                    <circle key={`pulse-${n.id}`} r={isBest ? 3.2 : 2} fill={isBest ? GREEN : BLUE} style={{ transition: "fill 0.6s ease" }}>
                      <animateMotion dur={`${isBest ? 1.6 : 2.7 + (i % 3) * 0.35}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} path={pathTo(n.pos.x, n.pos.y)} />
                    </circle>
                  );
                })}

              {/* Provider nodes */}
              {DEMO_NODES.map((n) => {
                const isBest = n.id === activeNode.id;
                const color = isBest ? GREEN : BLUE;
                const Icon = n.icon;
                return (
                  <motion.g key={n.id} animate={isBest ? { scale: [1, 1.06, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}>
                    {isBest && !reduce && (
                      <motion.circle
                        cx={n.pos.x}
                        cy={n.pos.y}
                        r={22}
                        fill="none"
                        stroke={GREEN}
                        strokeWidth={1.5}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        style={{ transformOrigin: "center", transformBox: "fill-box" } as never}
                      />
                    )}
                    <rect
                      x={n.pos.x - 22}
                      y={n.pos.y - 22}
                      width="44"
                      height="44"
                      rx="12"
                      fill={isBest ? "rgba(87,217,163,0.08)" : "#141416"}
                      stroke={isBest ? GREEN : "rgba(103,152,255,0.32)"}
                      strokeWidth={isBest ? 1.6 : 1}
                      style={{ transition: "fill 0.6s ease, stroke 0.6s ease, stroke-width 0.6s ease" }}
                    />
                    <foreignObject x={n.pos.x - 22} y={n.pos.y - 22} width="44" height="44">
                      <div className="flex h-11 w-11 items-center justify-center" style={{ color, transition: "color 0.6s ease" }}>
                        <Icon size={19} weight={isBest ? "fill" : "regular"} />
                    </div>
                  </foreignObject>
                    <text x={n.pos.x} y={n.pos.y + 36} textAnchor="middle" fill={isBest ? GREEN : "#a5a5ac"} fontSize="10.5" fontFamily="var(--font-jetbrains-mono)" style={{ transition: "fill 0.6s ease" }}>
                    {n.label}
                  </text>
                </motion.g>
                );
              })}

              {/* Central hub */}
              <g>
                <circle cx={HUB.x} cy={HUB.y} r="52" fill="rgba(103,152,255,0.06)" />
                <rect x={HUB.x - 34} y={HUB.y - 34} width="68" height="68" rx="18" fill="#111114" stroke="rgba(103,152,255,0.4)" strokeWidth="1.5" />
                <foreignObject x={HUB.x - 34} y={HUB.y - 34} width="68" height="68">
                  <div className="flex h-[68px] w-[68px] items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#6798ff]" fill="currentColor" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z" /></svg>
                  </div>
                </foreignObject>
                <text x={HUB.x} y={HUB.y + 50} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600" fontFamily="var(--font-inter)">Argus</text>
              </g>

              {/* Active RPC badge */}
              <motion.g animate={reduce ? undefined : { y: [0, -3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>
                <rect x={HUB.x - 72} y={HUB.y - 102} width="144" height="26" rx="13" fill="rgba(87,217,163,0.1)" stroke="rgba(87,217,163,0.35)" />
                <text x={HUB.x} y={HUB.y - 84} textAnchor="middle" fill={GREEN} fontSize="10.5" fontWeight="600" fontFamily="var(--font-jetbrains-mono)">
                  BEST RPC
                </text>
                <text x={HUB.x} y={HUB.y - 67} textAnchor="middle" fill="#e8f7f1" fontSize="13" fontWeight="600" fontFamily="var(--font-inter)">
                  {activeNode.label}
                </text>
              </motion.g>
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LegendDot({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
      <span className="relative flex h-2 w-2">
        {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: color }} />}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
      </span>
      {label}
    </span>
  );
}
