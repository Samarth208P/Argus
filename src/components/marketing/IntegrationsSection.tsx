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
              {/* Connection lines */}
              {NODES.map((n, i) => {
                const mx = (HUB.x + n.x) / 2;
                return (
                  <motion.path
                    key={`line-${i}`}
                    d={`M${n.x},${n.y} Q${mx},${n.y} ${mx},${(n.y + HUB.y) / 2} T${HUB.x},${HUB.y}`}
                    fill="none"
                    stroke="url(#int-grad)"
                    strokeWidth="1.25"
                    initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
                    whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.9, ease: "easeOut" }}
                  />
                );
              })}

              {/* Traveling pulses */}
              {!reduce &&
                NODES.map((n, i) => {
                  const mx = (HUB.x + n.x) / 2;
                  return (
                    <circle key={`pulse-${i}`} r="2.5" fill="#6798ff">
                      <animateMotion
                        dur={`${2.6 + (i % 4) * 0.5}s`}
                        repeatCount="indefinite"
                        begin={`${i * 0.3}s`}
                        path={`M${n.x},${n.y} Q${mx},${n.y} ${mx},${(n.y + HUB.y) / 2} T${HUB.x},${HUB.y}`}
                      />
                    </circle>
                  );
                })}

              <defs>
                <linearGradient id="int-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6798ff" stopOpacity="0.05" />
                  <stop offset="50%" stopColor="#6798ff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6798ff" stopOpacity="0.05" />
                </linearGradient>
              </defs>

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
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#6798ff]" fill="currentColor" aria-hidden><path fillRule="evenodd" clipRule="evenodd" d="M7.675.281A.609.609 0 018.32.014l13.303 2.94a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53z" /></svg>
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
