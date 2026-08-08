import { Wallet, HardDrives, Lightning, StackSimple, Quotes } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const PERSONAS = [
  { icon: Wallet, who: "Wallets", body: "Serve users a provider that is honest, not just fast — and fail over the moment one starts lying." },
  { icon: Lightning, who: "MEV searchers", body: "Know instantly when a relay quietly drops or reorders a transaction you depend on." },
  { icon: HardDrives, who: "Solo stakers", body: "Cross-check your own node against consensus and catch silent divergence before it costs you." },
  { icon: StackSimple, who: "Rollups & bridges", body: "Feed integrity scores into routing so critical reads never hit a censoring endpoint." },
];

export function UseCasesSection() {
  return (
    <section aria-label="Who Argus is for" className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow="Who it's for"
          title="Built for anyone who can't afford to be lied to."
          description="If a wrong or withheld answer from an RPC would cost you money, safety, or trust — Argus is your independent second opinion."
          className="mb-16 max-w-[720px]"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERSONAS.map((p, i) => (
            <Reveal
              key={p.who}
              delay={((i % 4) + 1) as 1 | 2 | 3 | 4}
              className="group flex flex-col gap-4 rounded-[14px] border border-white/8 bg-[#0f0f12] p-6 transition-colors hover:border-white/16"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-white/8 bg-white/[0.03] text-[#6798ff]">
                <p.icon size={20} />
              </span>
              <h3 className="text-[17px] font-medium text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}>{p.who}</h3>
              <p className="text-[14.5px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>{p.body}</p>
            </Reveal>
          ))}
        </div>

        {/* Editorial statement (mission, not a fabricated endorsement) */}
        <Reveal className="mt-6 overflow-hidden rounded-[16px] border border-white/8 bg-gradient-to-b from-[#111114] to-[#0d0d0f] p-8 sm:p-12">
          <Quotes size={28} weight="fill" className="text-[#6798ff]/50" />
          <blockquote className="mt-5 max-w-[26ch] text-balance text-[clamp(24px,3.2vw,36px)] font-medium leading-[1.18] tracking-[-0.025em] text-white" style={{ fontFamily: "var(--font-inter)" }}>
            Censorship resistance means nothing if you can&rsquo;t tell when you&rsquo;re being censored.
          </blockquote>
          <p className="mt-6 text-[13px] uppercase tracking-[1.4px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
            The Argus premise — Road to Devcon 2026, Censorship Resistance track
          </p>
        </Reveal>
      </div>
    </section>
  );
}
