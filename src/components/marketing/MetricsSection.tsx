import { Reveal } from "@/components/ui/Reveal";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const METRICS = [
  { n: "01", value: 2.4, suffix: "M+", decimals: 1, label: "Responses cross-examined", sub: "Every poll, side by side" },
  { n: "02", value: 20, suffix: "s", decimals: 0, label: "Poll cadence", sub: "Always-on interrogation" },
  { n: "03", value: 99.98, suffix: "%", decimals: 2, label: "Consensus uptime", sub: "Across the monitored set" },
  { n: "04", value: 0, suffix: "", decimals: 0, label: "Trust required", sub: "Every claim is verifiable", literal: "Zero" },
];

export function MetricsSection() {
  return (
    <section aria-label="By the numbers" className="border-y border-white/8 bg-[#0c0c0e]">
      <div className="container-page grid grid-cols-1 gap-y-12 py-20 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m, i) => (
          <Reveal
            key={m.n}
            delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
            className="flex flex-col gap-3 border-white/8 lg:border-l lg:first:border-l-0 lg:px-8 lg:first:pl-0"
          >
            <span className="text-[11px] text-[#54545a] tnum" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{m.n}</span>
            <span className="text-[clamp(40px,5vw,60px)] font-medium leading-none tracking-[-0.04em] text-white tnum" style={{ fontFamily: "var(--font-inter)" }}>
              {m.literal ? (
                m.literal
              ) : (
                <AnimatedCounter value={m.value} suffix={m.suffix} decimals={m.decimals} />
              )}
            </span>
            <span className="text-[15px] font-medium text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}>{m.label}</span>
            <span className="text-[13px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>{m.sub}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
