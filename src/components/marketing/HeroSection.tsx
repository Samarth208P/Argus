"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, Eye, Pulse, Lock } from "@phosphor-icons/react";
import BlurText from "@/components/ui/BlurText";
import ShinyText from "@/components/ui/ShinyText";
import Scanner from "@/components/ui/Scanner";
import GradualBlur from "@/components/ui/GradualBlur";

// Emil-style entry animations
const EASING = "easeOut" as const;
const ENTRY = {
  initial: { opacity: 0, y: 30, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { ease: EASING, duration: 0.8 },
};

const STATS = [
  { icon: Eye, value: "8", label: "Nodes Monitored", caption: "Live Mainnet & Sepolia" },
  { icon: Pulse, value: "20s", label: "Poll Cadence", caption: "Always-on verification" },
  { icon: Lock, value: "Zero", label: "Trust Required", caption: "Cryptographic consensus" },
];

export function HeroSection() {
  return (
    <section id="hero" className="relative pt-48 pb-24 min-h-[80vh] flex flex-col items-center justify-center overflow-hidden" aria-label="Argus hero">
      <div className="absolute inset-0 z-0">
        <Scanner
          color1="#00f0ff"
          color2="#818cf8"
          color3="#ffffff"
          opacity={0.3}
          mouseInteraction={true}
          mouseRadius={0.8}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-12 w-full">
        {/* Massive Headline */}
        <div className="flex flex-col items-start gap-0 min-h-[200px]" style={{ fontFamily: "var(--font-cinzel)", textTransform: "uppercase" }}>
          <BlurText
            text="Every Ethereum RPC. Cross-Examined."
            delay={50}
            animateBy="words"
            direction="top"
            className="text-[clamp(60px,12vw,140px)] font-semibold leading-[0.85] text-white tracking-tighter"
          />
        </div>

        {/* Subtext and CTA */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
          <motion.p
            {...ENTRY}
            transition={{ ease: EASING, duration: 0.8, delay: 0.2 }}
            className="max-w-[500px] text-[20px] leading-[1.6] text-[#888888] font-medium"
            style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.5px" }}
          >
            Argus catches stale data, mutated state, and censored transactions
            with cryptographic receipts anyone can verify.
          </motion.p>

          <motion.div
            {...ENTRY}
            transition={{ ease: EASING, duration: 0.8, delay: 0.3 }}
            className="flex flex-col md:items-end gap-6"
          >
            <Link
              href="#leaderboard"
              className="group relative inline-flex items-center justify-center gap-4 bg-white text-black px-8 py-5 rounded-full overflow-hidden transition-all duration-300 hover:scale-[0.98] active:scale-[0.95]"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              <span className="relative z-10 text-[18px] font-bold tracking-tight">
                <ShinyText text="Access Live Terminal" disabled={false} speed={3} className="text-black" color="#000000" shineColor="#818cf8" />
              </span>
              <ArrowRight size={20} weight="bold" className="relative z-10 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 bg-[#00f0ff] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            </Link>
          </motion.div>
        </div>

        {/* Minimalist Stats Grid */}
        <div className="mt-32 border-t border-[#111111] pt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 md:divide-x divide-[#111111]">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: EASING }}
                className="flex flex-col md:px-12 first:pl-0 last:pr-0"
              >
                <div className="flex items-center gap-3 mb-4">
                  <stat.icon size={20} color="#00f0ff" weight="bold" />
                  <span className="text-[14px] text-[#00f0ff] font-medium tracking-widest uppercase" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                    {stat.label}
                  </span>
                </div>
                <p className="text-[56px] font-bold leading-none text-white tracking-tighter mb-2" style={{ fontFamily: "var(--font-cinzel)" }}>
                  {stat.value}
                </p>
                <p className="text-[16px] text-[#666666] font-medium" style={{ fontFamily: "var(--font-outfit)" }}>
                  {stat.caption}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Gradual blur transition into the next section */}
      <GradualBlur
        target="parent"
        position="bottom"
        height="12rem"
        strength={4}
        divCount={8}
        curve="bezier"
        exponential={true}
        opacity={1}
      />
    </section>
  );
}
