import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terminal Dashboard — Argus",
  description: "Interactive live dashboard for provider integrity, incidents, and routing decisions.",
};

export default function DemoPage() {
  return (
    <>
      <Navbar />
      <main role="main" className="blueprint-grid min-h-[100dvh] pt-[112px] pb-16">
        <div className="container-page">
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
            <ArrowLeft size={13} /> Back to overview
          </Link>

          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="The live terminal"
              title="Provider integrity, right now."
              description="Real cross-examination running against live endpoints. Sort by any metric, open a provider to inspect its evidence trail, or verify a claim yourself."
              className="max-w-[640px]"
            />
            <Reveal delay={2} className="flex items-center gap-2 self-start rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 md:self-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6798ff] live-dot" />
              <span className="text-[12px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                Refreshes every 30s
              </span>
            </Reveal>
          </div>

          <DashboardContainer />
        </div>
      </main>
      <Footer />
    </>
  );
}
