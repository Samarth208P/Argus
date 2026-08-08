"use client";

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
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

// Positions on a 600x420 viewBox, arranged around a central hub.
const NODES = [
  { icon: Cloud, label: "Cloudflare", x: 70, y: 60 },
  { icon: Lightning, label: "Flashbots", x: 70, y: 210 },
  { icon: Database, label: "LlamaNodes", x: 70, y: 360 },
  { icon: Globe, label: "PublicNode", x: 300, y: 40 },
  { icon: Cube, label: "dRPC", x: 300, y: 380 },
  { icon: Broadcast, label: "Sepolia", x: 530, y: 60 },
  { icon: ChatCircle, label: "Slack alerts", x: 530, y: 210 },
  { icon: PlugsConnected, label: "Webhooks", x: 530, y: 360 },
];
const HUB = { x: 300, y: 210 };

/**
 * Builds a cubic bezier path from node to hub.
 * Handles three cases:
 *  - Same x (top/bottom): straight vertical bezier — radial gradient makes it visible
 *  - Same y (left/right): S-curve bow so the line isn't degenerate/invisible
 *  - Diagonal: classic S-curve that already looks great
 */
function buildPath(n: { x: number; y: number }, hub: { x: number; y: number }): string {
  const dx = hub.x - n.x;
  const dy = hub.y - n.y;
  const mx = (hub.x + n.x) / 2;
  const my = (hub.y + n.y) / 2;

  // Vertically aligned (PublicNode / dRPC) — simple cubic, no bezier degeneracy
  if (Math.abs(dx) < 5) {
    return `M${n.x},${n.y} C${n.x},${my} ${hub.x},${my} ${hub.x},${hub.y}`;
  }

  // Horizontally aligned (Flashbots / Slack alerts) — add a gentle perpendicular bow
  if (Math.abs(dy) < 5) {
    const bow = 38 * (n.x < hub.x ? 1 : -1);
    return `M${n.x},${n.y} C${mx},${n.y - bow} ${mx},${hub.y + bow} ${hub.x},${hub.y}`;
  }

  // Diagonal — classic Q-T S-curve (unchanged, looks great already)
  return `M${n.x},${n.y} Q${mx},${n.y} ${mx},${my} T${hub.x},${hub.y}`;
}

export function IntegrationsSection() {
  const reduce = useReducedMotion();
  return (
    <section aria-label="Integrations" className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="Connected"
          title="Wired into the endpoints you already trust."
          description="Argus sits between your infrastructure and the providers it depends on — pulling from every major RPC, pushing verdicts to Ethereum, Slack, and your own webhooks."
          align="center"
          className="mx-auto mb-16 max-w-[720px]"
        />

        <Reveal className="mx-auto max-w-[860px]">
          <div className="relative overflow-hidden rounded-[20px] border border-white/8 bg-[#0d0d0f] p-4 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute inset-0 dot-bg opacity-40" />
            <svg viewBox="0 0 600 420" className="relative w-full" role="img" aria-label="Argus integration network">
              <defs>
                {/*
                  Radial gradient centred at the hub so ALL lines — including
                  perfectly vertical or horizontal ones — render with proper
                  opacity regardless of their bounding-box dimensions.
                */}
                <radialGradient
                  id="int-grad"
                  cx={HUB.x}
                  cy={HUB.y}
                  r="280"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%"   stopColor="#6798ff" stopOpacity="0.6" />
                  <stop offset="55%"  stopColor="#6798ff" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#6798ff" stopOpacity="0.04" />
                </radialGradient>
              </defs>

              {/* Connection lines */}
              {NODES.map((n, i) => (
                <motion.path
                  key={`line-${i}`}
                  d={buildPath(n, HUB)}
                  fill="none"
                  stroke="url(#int-grad)"
                  strokeWidth="1.25"
                  initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
                  whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.9, ease: "easeOut" }}
                />
              ))}

              {/* Traveling pulses */}
              {!reduce &&
                NODES.map((n, i) => (
                  <circle key={`pulse-${i}`} r="2.5" fill="#6798ff">
                    <animateMotion
                      dur={`${2.6 + (i % 4) * 0.5}s`}
                      repeatCount="indefinite"
                      begin={`${i * 0.3}s`}
                      path={buildPath(n, HUB)}
                    />
                  </circle>
                ))}

              {/* Nodes */}
              {NODES.map((n, i) => (
                <motion.g
                  key={n.label}
                  initial={reduce ? undefined : { opacity: 0, scale: 0.6 }}
                  whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <rect x={n.x - 22} y={n.y - 22} width="44" height="44" rx="12" fill="#141416" stroke="rgba(255,255,255,0.1)" />
                  <foreignObject x={n.x - 22} y={n.y - 22} width="44" height="44">
                    <div className="flex h-11 w-11 items-center justify-center">
                      <n.icon size={19} color="#a5a5ac" />
                    </div>
                  </foreignObject>
                  <text x={n.x} y={n.y + 36} textAnchor="middle" fill="#7c7c82" fontSize="10.5" fontFamily="var(--font-jetbrains-mono)">
                    {n.label}
                  </text>
                </motion.g>
              ))}

              {/* Central hub */}
              <motion.g
                initial={reduce ? undefined : { opacity: 0, scale: 0.7 }}
                whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <circle cx={HUB.x} cy={HUB.y} r="52" fill="rgba(103,152,255,0.06)" />
                <rect x={HUB.x - 34} y={HUB.y - 34} width="68" height="68" rx="18" fill="#111114" stroke="rgba(103,152,255,0.4)" strokeWidth="1.5" />
                <foreignObject x={HUB.x - 34} y={HUB.y - 34} width="68" height="68">
                  <div className="flex h-[68px] w-[68px] items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#6798ff]" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" clipRule="evenodd" d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z" />
                    </svg>
                  </div>
                </foreignObject>
                <text x={HUB.x} y={HUB.y + 50} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600" fontFamily="var(--font-inter)">
                  Argus
                </text>
              </motion.g>
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
