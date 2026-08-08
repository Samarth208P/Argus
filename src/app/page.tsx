import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TrustBar } from "@/components/marketing/TrustBar";
import { FeatureStory } from "@/components/marketing/FeatureStory";
import { EvidenceSection } from "@/components/marketing/EvidenceSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { FinalCTA } from "@/components/marketing/FinalCTA";

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
        <EvidenceSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
