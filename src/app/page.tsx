import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";
import { getLatestScores, getRecentIncidents, getProviders } from "@/lib/db/queries";
import { selectRoute } from "@/lib/engine/router";

// Revalidate every 30s (ISR)
export const revalidate = 30;

export default async function HomePage() {
  // Fetch initial data server-side (RSC)
  let scores: Awaited<ReturnType<typeof getLatestScores>> = [];
  let incidents: Awaited<ReturnType<typeof getRecentIncidents>> = [];
  let providers: Awaited<ReturnType<typeof getProviders>> = [];
  let decision: Awaited<ReturnType<typeof selectRoute>> = {
    status: "NO_CANDIDATES",
    best: null,
    candidates: [],
    policy: { min_score: 50, max_age_ms: 300000 },
    decided_at: new Date().toISOString(),
  };

  try {
    const [fetchedScores, fetchedIncidents, fetchedProviders, fetchedDecision] = await Promise.all([
      getLatestScores(),
      getRecentIncidents(50),
      getProviders(),
      selectRoute(),
    ]);
    scores = fetchedScores;
    incidents = fetchedIncidents;
    providers = fetchedProviders;
    decision = fetchedDecision;
  } catch {
    // Supabase not yet configured — render with empty state
  }

  return (
    <>
      <Navbar />
      <main role="main" className="blueprint-grid min-h-[100dvh] pt-24 pb-12">
        <DashboardContainer
          scores={scores}
          incidents={incidents}
          providers={providers}
          decision={decision}
        />
      </main>
      <Footer />
    </>
  );
}
