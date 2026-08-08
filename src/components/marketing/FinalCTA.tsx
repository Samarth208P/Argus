import Link from "next/link";
import { ArrowRight, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <section aria-label="Get started" className="section">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0d0f] px-6 py-20 text-center sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg fade-mask opacity-60" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(ellipse_50%_70%_at_50%_0%,rgba(103,152,255,0.16),transparent_70%)]" />

          <div className="relative">
            <span className="chip mx-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-[#57d9a3]" />
              Live on Ethereum mainnet &amp; Sepolia
            </span>
            <h2 className="mx-auto mt-7 max-w-[18ch] text-balance text-[clamp(34px,5.4vw,64px)] font-medium leading-[1.02] tracking-[-0.04em] text-white" style={{ fontFamily: "var(--font-inter)" }}>
              Stop trusting your RPC. Start verifying it.
            </h2>
            <p className="mx-auto mt-6 max-w-[52ch] text-[18px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
              Open the live terminal to watch every provider get cross-examined in
              real time — or paste an incident ID and verify the evidence yourself.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/terminal" className="btn-primary">
                Open the terminal
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link href="/verify" className="btn-ghost">
                <ShieldCheck size={16} />
                Verify evidence
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
