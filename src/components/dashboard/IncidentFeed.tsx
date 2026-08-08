"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabaseBrowser } from "@/lib/db/supabase";
import type { DbIncident, DbScore } from "@/lib/db/types";
import { ArrowRight, Circle, Warning, Clock, ShieldSlash } from "@phosphor-icons/react";
import { COLORS, scoreColor } from "@/lib/design-tokens";

// ── Incident Feed ─────────────────────────────────────────
interface IncidentFeedProps {
  initialIncidents: DbIncident[];
  scores: Record<string, number>; // providerId → score
  onSelectIncident?: (id: string) => void;
}

const KIND_ICONS = {
  DEVIANT: Warning,
  STALE: Clock,
  CENSORING: ShieldSlash,
  DOWN: Circle,
};

const KIND_LABEL_CLASS: Record<string, string> = {
  DEVIANT: "badge-deviant",
  STALE: "badge-stale",
  CENSORING: "badge-censoring",
  DOWN: "badge-down",
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function IncidentFeed({ initialIncidents, scores, onSelectIncident }: IncidentFeedProps) {
  const [incidents, setIncidents] = useState<DbIncident[]>(initialIncidents);

  // ── Supabase Realtime subscription ───────────────────────
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabaseBrowser
        .channel("public:incidents")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "incidents" },
          (payload) => {
            setIncidents((prev) => [payload.new as DbIncident, ...prev].slice(0, 100));
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Failed to subscribe to realtime updates:", err);
    }

    return () => {
      if (channel) {
        try {
          supabaseBrowser.removeChannel(channel);
        } catch (err) {
          console.warn("Failed to remove channel:", err);
        }
      }
    };
  }, []);

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-white/10 bg-black/40 backdrop-blur-xl py-16 text-center shadow-xl">
        <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
          <Circle size={16} color="#888888" />
        </div>
        <p className="text-[14px] text-[#888888]" style={{ fontFamily: "var(--font-outfit)" }}>
          No incidents detected yet. All providers appear honest.
        </p>
        <p className="eyebrow text-[#888888]">MONITORING IN PROGRESS</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <AnimatePresence initial={false}>
        {incidents.slice(0, 20).map((incident, i) => {
          const Icon = KIND_ICONS[incident.kind] ?? Warning;
          const providerScore = scores[incident.provider_id];

          return (
            <motion.button
              key={incident.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: i === 0 ? 0 : 0 }}
              onClick={() => onSelectIncident?.(incident.id)}
              className="w-full rounded-[12px] bg-black/40 backdrop-blur-xl border border-white/5 px-5 py-3.5 flex items-center gap-4 text-left hover:bg-white/5 hover:scale-[1.01] hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] transition-all duration-200 ease-out"
              aria-haspopup="dialog"
              id={`incident-row-${incident.id}`}
            >
              <Icon
                size={16}
                color={incident.kind === "DEVIANT" ? "#ff6b6b" : incident.kind === "STALE" ? "#ffc04d" : incident.kind === "CENSORING" ? "#9898ff" : "#454545"}
                aria-hidden="true"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={KIND_LABEL_CLASS[incident.kind] ?? "badge-down"}>
                    {incident.kind}
                  </span>
                  <span
                    className="text-[13px] text-white truncate"
                    style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.5px" }}
                  >
                    {incident.provider_id}
                  </span>
                  {providerScore !== undefined && (
                    <span
                      className="text-[11px]"
                      style={{ color: scoreColor(providerScore), fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      score {providerScore}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="text-[12px] text-[#454545] tabular-nums"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  {timeAgo(incident.t)}
                </span>
                <a
                  href={`/verify?id=${incident.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[12px] text-[#00f0ff] hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  title="Verify this incident"
                >
                  VERIFY
                  <ArrowRight size={11} weight="bold" />
                </a>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
