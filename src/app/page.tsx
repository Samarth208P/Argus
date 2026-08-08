import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { IncidentFeed } from "@/components/dashboard/IncidentFeed";
import { AdversaryPanel } from "@/components/dashboard/AdversaryPanel";
import { AddProviderForm } from "@/components/dashboard/AddProviderForm";
import StrokeText from "@/components/ui/StrokeText";

import { getLatestScores, getRecentIncidents, getProviders } from "@/lib/db/queries";
import { selectRoute } from "@/lib/engine/router";

// Revalidate every 30s (ISR)
export const revalidate = 30;

export default async function HomePage() {
  // Fetch initial data server-side (RSC)
  // These fall back gracefully if Supabase isn't connected yet
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

  const scoreMap = Object.fromEntries(scores.map((s) => [s.provider_id, s.score]));

  return (
    <>
      <Navbar />
      <main role="main">
        {/* ── Hero + Proof Summary ───────────────────────── */}
        <HeroSection />

        {/* ── Live Dashboard ────────────────────────────── */}
        <div className="mx-auto max-w-[1200px] px-6 py-16 flex flex-col gap-16">

          {/* Leaderboard */}
          <section id="leaderboard" aria-label="Provider leaderboard" className="animate-fade-in-up">
            <div className="mb-6 flex items-baseline justify-between">
              <div>
                <p className="eyebrow mb-2">LEADERBOARD</p>
                <div className="mt-2 mb-2 w-full max-w-[400px]">
                  <StrokeText
                    text="Provider Integrity Scores"
                    strokeColor="#00f0ff"
                    fillColor="#ffffff"
                    strokeWidth={1.2}
                    fontSize={32}
                    fontWeight={600}
                    trigger="scroll"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#6798ff] animate-pulse"
                  aria-hidden="true"
                />
                <span
                  className="text-[12px] text-[#454545]"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  Refreshes every 30s
                </span>
              </div>
            </div>
            <LeaderboardTable initialScores={scores as any} providers={providers} />
          </section>

          {/* Single-column stacked layout: incident feed + router widget + adversary panel */}
          <section
            id="live-feed"
            aria-label="Live incident feed"
            className="flex flex-col gap-12"
          >
            {/* Incident Feed */}
            <div className="animate-fade-in-up delay-100">
              <div className="mb-5">
                <p className="eyebrow mb-2">LIVE FEED</p>
                <h2
                  className="text-[20px] font-medium text-white"
                  style={{
                    fontFamily: "var(--font-outfit)",
                    letterSpacing: "-0.42px",
                  }}
                >
                  Incidents
                </h2>
              </div>
              <IncidentFeed initialIncidents={incidents} scores={scoreMap} />
            </div>

            {/* Best RPC widget */}
            <div className="animate-fade-in-up delay-200">
              <div>
                <div className="mb-5">
                  <p className="eyebrow mb-2">AUTO ROUTER</p>
                  <h2
                    className="text-[20px] font-medium text-white"
                    style={{
                      fontFamily: "var(--font-outfit)",
                      letterSpacing: "-0.42px",
                    }}
                  >
                    Best RPC Now
                  </h2>
                </div>
                {decision.best ? (
                  <div className="card flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[4px] border border-[#313131] bg-[#1e1e1e] flex items-center justify-center">
                        <span
                          className="text-[10px] font-medium text-[#6798ff]"
                          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                        >
                          {decision.best.provider_id.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <p
                            className="text-[15px] font-medium text-white"
                            style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                          >
                            {decision.best.provider_id}
                          </p>
                          <p
                            className="text-[12px] text-[#6798ff]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            Score {decision.best.score}/100
                          </p>
                        </div>
                        {decision.status === "DEGRADED" ? (
                          <span
                            className="badge text-[10px] uppercase border border-amber-500/30 text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-[4px]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                            title="All providers degraded — least-bad shown"
                          >
                            DEGRADED
                          </span>
                        ) : (
                          <span
                            className="badge text-[10px] uppercase border border-[#4dffb0]/30 text-[#4dffb0] bg-[#4dffb0]/5 px-2 py-0.5 rounded-[4px]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            HEALTHY
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className="text-[13px] text-[#7c7c7c] leading-[1.5]"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {decision.status === "DEGRADED"
                        ? "Warning: All available providers are currently degraded. Showing the least-bad option."
                        : "Integrity-first routing: censoring providers are fast but dishonest. Argus prioritizes verified honest endpoints."}
                    </p>
                    <code
                      className="mono-code text-[11px] break-all"
                      title="Recommended RPC endpoint"
                    >
                      {decision.best.url}
                    </code>
                  </div>
                ) : (
                  <div className="card flex items-center justify-center py-8">
                    <p className="text-[14px] text-[#454545]" style={{ fontFamily: "var(--font-inter)" }}>
                      Collecting data...
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Demo & Simulation Controls */}
            <div className="animate-fade-in-up delay-300">
              <details className="group border border-white/5 bg-[#141414]/30 rounded-[12px] overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer select-none text-white hover:bg-white/5 transition-colors">
                  <span
                    className="text-[12px] font-medium uppercase tracking-[0.85px]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    Demo & Simulation Controls
                  </span>
                  <span className="transition-transform duration-200 group-open:rotate-90 text-[#a7a7a7]">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                </summary>
                <div className="p-6 border-t border-white/5 flex flex-col gap-10 bg-black/40 backdrop-blur-xl">
                  <AdversaryPanel providers={providers} />
                  <AddProviderForm />
                </div>
              </details>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
