import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { CommandTrigger } from "@/components/command/CommandPalette";

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Live Monitor", href: "/terminal" },
      { label: "Integrity Leaderboard", href: "/terminal#leaderboard" },
      { label: "Incident Feed", href: "/terminal#live-feed" },
      { label: "Auto Router", href: "/terminal" },
    ],
  },
  {
    heading: "Verify",
    links: [
      { label: "Verify a Claim", href: "/verify" },
      { label: "Evidence API", href: "/api/evidence", external: true },
      { label: "Sepolia Etherscan", href: "https://sepolia.etherscan.io", external: true },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "PRD", href: "/PRD.md" },
      { label: "Design system", href: "/DESIGN.md" },
      { label: "GitHub", href: "https://github.com", external: true },
    ],
  },
  {
    heading: "Track",
    links: [
      { label: "Road to Devcon 2026", href: "#" },
      { label: "IIT Roorkee", href: "#" },
      { label: "Censorship Resistance", href: "#" },
    ],
  },
];

function ArgusMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6798ff]" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.675.281A.609.609 0 018.32.014l13.303 2.94a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53z" />
    </svg>
  );
}

export function Footer() {
  const contractAddress = process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0x…deploy pending";

  return (
    <footer role="contentinfo" className="border-t border-white/8 bg-[#0a0a0b]">
      <div className="container-page py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          {/* Brand block */}
          <div className="max-w-[280px]">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Argus home">
              <ArgusMark />
              <span className="text-[16px] font-semibold tracking-[0.5px] text-white" style={{ fontFamily: "var(--font-inter)" }}>Argus</span>
            </Link>
            <p className="mt-4 text-[14px] leading-[1.6] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
              A lie detector for Ethereum RPCs. Continuous cross-examination, cryptographic evidence, on-chain proof.
            </p>
            <div className="mt-5">
              <CommandTrigger className="flex h-9 w-fit items-center gap-2 rounded-[9px] border border-white/10 bg-white/[0.03] px-3 text-[13px] text-[#a5a5ac] transition-colors hover:border-white/18 hover:text-white" />
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-[11px] uppercase tracking-[1.4px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                {col.heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-1 text-[14px] text-[#a5a5ac] transition-colors hover:text-white"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {link.label}
                        <ArrowUpRight size={12} className="text-[#54545a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[14px] text-[#a5a5ac] transition-colors hover:text-white"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col gap-4 border-t border-white/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] text-[#7c7c82]" style={{ fontFamily: "var(--font-inter)" }}>
            © {new Date().getFullYear()} Argus · Built at Road to Devcon 2026, IIT Roorkee.
          </span>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>ArgusAttest · Sepolia</span>
            <code className="mono-code text-[11px]" title="ArgusAttest contract address">{contractAddress}</code>
          </div>
        </div>
      </div>
    </footer>
  );
}
