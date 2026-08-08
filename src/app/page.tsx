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
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { IncidentFeed } from "@/components/dashboard/IncidentFeed";
import { AdversaryPanel } from "@/components/dashboard/AdversaryPanel";
import { AddProviderForm } from "@/components/dashboard/AddProviderForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Path } from "@phosphor-icons/react/dist/ssr";

import { getLatestScores, getRecentIncidents, getProviders } from "@/lib/db/queries";

// Revalidate every 30s (ISR)
export const revalidate = 30;

export default async function HomePage() {
  let scores: Awaited<ReturnType<typeof getLatestScores>> = [];
  let incidents: Awaited<ReturnType<typeof getRecentIncidents>> = [];
  let providers: Awaited<ReturnType<typeof getProviders>> = [];

  try {
    [scores, incidents, providers] = await Promise.all([
      getLatestScores(),
      getRecentIncidents(50),
      getProviders(),
    ]);
  } catch {
    // Supabase not yet configured — render with empty state
  }

  const scoreMap = Object.fromEntries(scores.map((s) => [s.provider_id, s.score]));
const best = scores.reduce<(typeof scores)[number] | undefined>(
    (acc, s) => (!acc || s.score > acc.score ? s : acc),
    undefined
  );
  const bestUrl = best ? providers.find((p) => p.id === best.provider_id)?.url ?? best.provider_id : null;

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main role="main">
        {/* ── Marketing narrative ─────────────────────────── */}
        <HeroSection />
        <TrustBar />
        <FeatureStory />
        <MetricsSection />
        <EvidenceSection />

        {/* ── The live terminal (real data) ───────────────── */}
        <section id="leaderboard" aria-label="Live terminal" className="section border-t border-white/8">
          <div className="container-page">
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

            <Reveal>
              <LeaderboardTable initialScores={scores as never} providers={providers} />
            </Reveal>

            {/* Live feed + auto router */}
            <div id="live-feed" className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="eyebrow mb-4">Live feed · incidents</p>
                <IncidentFeed initialIncidents={incidents} scores={scoreMap} />
              </div>

              <div className="flex flex-col gap-6">
                <div>
                  <p className="eyebrow mb-4">Auto router · best RPC now</p>
                  {best ? (
                    <div className="card flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/8 bg-white/[0.03]">
                          <Path size={18} className="text-[#6798ff]" weight="bold" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}>
                            {best.provider_id}
                          </p>
                          <p className="text-[12px] text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                            Integrity {best.score}/100
                          </p>
                        </div>
                      </div>
                      <p className="text-[13.5px] leading-[1.6] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
                        Integrity-first routing: censoring providers are fast but dishonest. Argus prioritizes verified-honest endpoints.
                      </p>
                      <code className="mono-code block break-all text-[11px]" title="Recommended RPC endpoint">
                        {bestUrl}
                      </code>
                    </div>
                  ) : (
                    <div className="card flex items-center justify-center py-10">
                      <p className="text-[14px] text-[#54545a]" style={{ fontFamily: "var(--font-inter)" }}>Collecting data…</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Adversary + registry */}
            <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div id="adversary">
                <AdversaryPanel providers={providers} />
              </div>
              <div id="registry">
                <AddProviderForm />
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing narrative ───────────────────────────── */}
        <UseCasesSection />
        <IntegrationsSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
