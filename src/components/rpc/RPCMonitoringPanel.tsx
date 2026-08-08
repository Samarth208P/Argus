"use client";

import { IncidentFeed } from "@/components/dashboard/IncidentFeed";
import { AdversaryPanel } from "@/components/dashboard/AdversaryPanel";
import { AddProviderForm } from "@/components/dashboard/AddProviderForm";
import type { DbIncident, DbProvider } from "@/lib/db/types";

export function RPCMonitoringPanel({
  incidents,
  providers,
  scoreMap,
}: {
  incidents: DbIncident[];
  providers: DbProvider[];
  scoreMap: Record<string, number>;
}) {
  return (
    <section aria-label="Live monitoring" className="mt-24">
      <h2 className="text-[24px] font-medium tracking-[-0.4px] text-white" style={{ fontFamily: "var(--font-inter)" }}>
        Live monitoring
      </h2>
      <p className="mt-2 max-w-[56ch] text-[15px] text-[#a5a5ac]" style={{ fontFamily: "var(--font-inter)" }}>
        Incidents as they happen, plus tools to stress-test detection and register your own endpoints.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow mb-4">Live feed · incidents</p>
          <IncidentFeed incidents={incidents} scores={scoreMap} />
        </div>
        <div className="flex flex-col gap-6">
          <AdversaryPanel
            providers={providers}
            activeAdversary={{ targetId: null, mode: null, expiresAt: null }}
            onToggle={async () => {}}
          />
          <AddProviderForm onAddProvider={() => {}} />
        </div>
      </div>
    </section>
  );
}
