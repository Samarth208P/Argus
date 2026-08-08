import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TrustBar } from "@/components/marketing/TrustBar";
import { FeatureStory } from "@/components/marketing/FeatureStory";
import { MetricsSection } from "@/components/marketing/MetricsSection";
import { EvidenceSection } from "@/components/marketing/EvidenceSection";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { UseCasesSection } from "@/components/marketing/UseCasesSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { getLatestScores, getProviders, getRecentScoreRows } from "@/lib/db/queries";

// Revalidate every 30s (ISR)
export const revalidate = 30;

export default async function HomePage() {
  let scores: Awaited<ReturnType<typeof getLatestScores>> = [];
  let providers: Awaited<ReturnType<typeof getProviders>> = [];
  let rows: Awaited<ReturnType<typeof getRecentScoreRows>> = [];

  try {
    [scores, providers, rows] = await Promise.all([
      getLatestScores(),
      getProviders(),
      getRecentScoreRows(600),
    ]);
  } catch {
    // Supabase not yet configured — render with empty/fallback state
  }

  return (
    <>
      <Navbar />
      <main role="main">
        <HeroSection initialScores={scores} providers={providers} initialRows={rows} />
        <TrustBar />
        <FeatureStory />
        <MetricsSection />
        <EvidenceSection />

        <section id="leaderboard" aria-label="Live terminal" className="section border-t border-white/8">
          <div className="container-page py-12">
            <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
        </section>

        <UseCasesSection />
        <IntegrationsSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
