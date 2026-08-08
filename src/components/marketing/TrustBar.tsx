import { Reveal } from "@/components/ui/Reveal";

const PROVIDERS = [
  "Cloudflare",
  "Flashbots",
  "LlamaNodes",
  "PublicNode",
  "dRPC",
  "Tenderly",
  "MEV Blocker",
  "OnFinality",
  "Blast API",
  "1RPC",
];

export function TrustBar() {
  return (
    <section aria-label="Providers monitored" className="border-y border-white/8 py-14">
      <div className="container-page">
        <Reveal as="p" className="mb-8 text-center text-[13px] text-[#7c7c82]">
          Continuously cross-examining the endpoints that settle Ethereum
        </Reveal>
      </div>
      <div
        className="relative overflow-hidden"
        style={{
          maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        <div className="marquee-track gap-14 pr-14">
          {[...PROVIDERS, ...PROVIDERS].map((name, i) => (
            <span
              key={i}
              className="shrink-0 whitespace-nowrap text-[19px] font-medium text-[#5a5a60] transition-colors"
              style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.3px" }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
