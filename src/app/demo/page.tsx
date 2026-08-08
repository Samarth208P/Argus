import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdversaryPanel } from "@/components/dashboard/AdversaryPanel";
import { IncidentFeed } from "@/components/dashboard/IncidentFeed";
import { getLatestScores, getProviders, getRecentIncidents } from "@/lib/db/queries";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";
import type { DbProvider, DbIncident, DbScore } from "@/lib/db/types";

export const revalidate = 0;

const BUILT_INS: DbProvider[] = MAINNET_PROVIDERS.map((provider) => ({
  id: provider.id,
  url: provider.url,
  label: provider.label,
  operator: provider.operator,
  type: provider.type,
  is_sim: false,
  network: provider.network,
  created_at: new Date(0).toISOString(),
}));

export default async function DemoPage() {
  let providers: DbProvider[] = BUILT_INS;
  let incidents: DbIncident[] = [];
  let scores: DbScore[] = [];

  const [providersResult, incidentsResult, scoresResult] = await Promise.allSettled([
    getProviders(),
    getRecentIncidents(20),
    getLatestScores(),
  ]);

  if (providersResult.status === "fulfilled") providers = providersResult.value;
  if (incidentsResult.status === "fulfilled") incidents = incidentsResult.value;
  if (scoresResult.status === "fulfilled") scores = scoresResult.value;

  const scoreMap = Object.fromEntries(scores.map((score) => [score.provider_id, score.score]));

  return (
    <>
      <Navbar />
      <main className="blueprint-grid min-h-[100dvh] pt-28 pb-16">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6">
          <section className="flex flex-col gap-2">
            <p className="eyebrow text-[10px]">CONTROLLED DEMO</p>
            <h1
              className="text-[32px] font-medium text-white"
              style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.6px" }}
            >
              Adversary Simulator
            </h1>
            <p
              className="max-w-[680px] text-[14px] leading-[1.55] text-[#888888]"
              style={{ fontFamily: "var(--font-outfit)" }}
            >
              Inject a temporary stale, mutated, or censoring response into one provider slot,
              then trigger `/api/poll` to watch Argus create live evidence.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <AdversaryPanel providers={providers} />
            <section className="flex flex-col gap-3">
              <div className="px-2">
                <p className="eyebrow text-[10px] mb-1">LIVE OUTPUT</p>
                <h2
                  className="text-[18px] font-medium text-white"
                  style={{ fontFamily: "var(--font-outfit)", letterSpacing: "-0.25px" }}
                >
                  Incident Feed
                </h2>
              </div>
              <IncidentFeed initialIncidents={incidents} scores={scoreMap} />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
