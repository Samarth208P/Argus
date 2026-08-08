import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

const FOOTER_COLUMNS = [
  {
    heading: "Platform",
    links: [
      { label: "Live Monitor", href: "/" },
      { label: "Leaderboard", href: "/#leaderboard" },
      { label: "Interrogate Console", href: "/#interrogate" },
      { label: "Adversary Simulator", href: "/demo" },
    ],
  },
  {
    heading: "Verify",
    links: [
      { label: "Verify a Claim", href: "/verify" },
      { label: "Evidence API", href: "/api/evidence" },
      { label: "Sepolia Etherscan", href: "https://sepolia.etherscan.io", external: true },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "PRD", href: "/PRD.md" },
      { label: "DESIGN.md", href: "/DESIGN.md" },
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

export function Footer() {
  const contractAddress = process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0x...deploy pending";

  return (
    <footer
      role="contentinfo"
      className="border-t border-[#1e1e1e] bg-[#0a0a0a]"
    >
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p
                className="eyebrow mb-5"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
              >
                {col.heading}
              </p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[14px] text-[#a7a7a7] hover:text-white transition-colors duration-150"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {link.label}
                        <ArrowUpRight size={12} className="text-[#454545]" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[14px] text-[#a7a7a7] hover:text-white transition-colors duration-150"
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
        <div className="mt-16 flex flex-col gap-4 border-t border-[#1e1e1e] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="#6798ff"
              fillRule="evenodd"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                clipRule="evenodd"
                d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z"
              />
            </svg>
            <span
              className="text-[13px] text-[#a7a7a7]"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Built at Road to Devcon 2026, IIT Roorkee. Censorship Resistance track.
            </span>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <span
              className="text-[11px] text-[#454545]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              ArgusAttest on Sepolia
            </span>
            <code
              className="mono-code text-[11px]"
              title="ArgusAttest contract address"
            >
              {contractAddress}
            </code>
          </div>
        </div>
      </div>
    </footer>
  );
}
