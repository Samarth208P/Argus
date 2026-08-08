import {
  ShieldCheck,
  Cube,
  Function as FunctionIcon,
  Key,
  Eye,
  ArrowsClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const GUARANTEES = [
  { icon: ShieldCheck, title: "Cryptographic evidence", body: "Every incident ships a signed bundle: the request, all responses, and a SHA-256 consensus hash." },
  { icon: Cube, title: "On-chain commitments", body: "Hourly Merkle roots are committed to Sepolia, so the record can't be quietly rewritten later." },
  { icon: FunctionIcon, title: "Isomorphic verification", body: "The exact consensus math runs on the server and in your browser — identical inputs, identical proof." },
  { icon: Key, title: "No custody, no keys", body: "Argus never touches funds or private keys. It reads public state and grades what it sees." },
  { icon: Eye, title: "Open methodology", body: "Scoring weights, fault classes and thresholds are transparent — no black-box reputation." },
  { icon: ArrowsClockwise, title: "Reproducible checks", body: "Each detection includes a one-line curl to replay the request against any endpoint yourself." },
];

export function SecuritySection() {
  return (
    <section aria-label="Security and reliability" className="section border-t border-white/8 bg-[#0c0c0e]">
      <div className="container-page">
        <SectionHeading
          eyebrow="Trust model"
          title="Verifiable by design, not by reputation."
          description="Argus is only useful if you never have to trust it. Everything it claims can be independently recomputed and checked against the chain."
          className="mb-16 max-w-[720px]"
        />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[16px] border border-white/8 bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-3">
          {GUARANTEES.map((g, i) => (
            <Reveal
              key={g.title}
              delay={((i % 3) + 1) as 1 | 2 | 3}
              className="group flex flex-col gap-3 bg-[#0d0d0f] p-7 transition-colors hover:bg-[#111114]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/8 bg-white/[0.03] text-[#6798ff] transition-colors group-hover:border-[#6798ff]/30 group-hover:bg-[#6798ff]/10">
                <g.icon size={19} />
              </span>
              <h3 className="mt-2 text-[16px] font-medium text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.2px" }}>
                {g.title}
              </h3>
              <p className="text-[14.5px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
                {g.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
