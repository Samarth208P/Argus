import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

function ArgusMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6798ff]" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.675.281A.609.609 0 018.32.014l10.047 2.222 2.511.555.628.139.157.034.04.01.01.001a.04.04 0 01.002.001l.06.016a.609.609 0 01.408.688l-3.63 19.82a.609.609 0 01-.989.358L1.718 10.605a.609.609 0 01-.123-.794l6.08-9.53zM3.34 10.374l13.118 10.971-5.76-13.394-7.358 2.423zm8.519-2.805l5.874 13.659L20.77 4.635l-8.912 2.934zM3.539 9.026l6.675-2.197-2.123-4.937L3.54 9.026zm7.836-2.58l8.195-2.698-1.466-.324-8.872-1.962 2.143 4.984z"
      />
    </svg>
  );
}

export function Footer() {
  const contractAddress = process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0xB62090c4a3cE28EBD12a71c92012b519a576F138";
  const etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;

  return (
    <footer role="contentinfo" className="border-t border-white/8 bg-[#0a0a0b]">
      <div className="container-page py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80" aria-label="Argus home">
              <ArgusMark />
              <span className="text-[15px] font-semibold tracking-[0.5px] text-white" style={{ fontFamily: "var(--font-inter)" }}>Argus</span>
            </Link>
            <span className="text-white/15">·</span>
            <p className="text-[13px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>
              Lie detector for Ethereum RPCs
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/terminal" className="text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
              Monitor
            </Link>
            <Link href="/verify" className="text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
              Verify
            </Link>
            <Link href="/#how" className="text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
              How it works
            </Link>
            <a
              href="https://github.com/Samarth208P/Argus"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 text-[13px] text-[#7c7c82] transition-colors hover:text-white"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              GitHub
              <ArrowUpRight size={11} className="text-[#54545a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[12px] text-[#3d3d42]" style={{ fontFamily: "var(--font-inter)" }}>
            © {new Date().getFullYear()} Argus · Road to Devcon 2026, IIT Roorkee
          </span>
          <a
            href={etherscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 text-[11px] text-[#54545a] transition-colors hover:text-[#a5a5ac]"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            title="View ArgusAttest contract on Sepolia Etherscan"
          >
            ArgusAttest · Sepolia
            <ArrowUpRight size={10} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
