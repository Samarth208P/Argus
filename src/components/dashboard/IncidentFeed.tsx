"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DbIncident, DbScore } from "@/lib/db/types";
import { ArrowRight, Circle, Warning, Clock, ShieldSlash } from "@phosphor-icons/react";
import { COLORS, scoreColor } from "@/lib/design-tokens";



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

interface IncidentFeedProps {
  incidents: DbIncident[];
  scores: Record<string, number>; // providerId → score
  onSelectIncident?: (id: string) => void;
}

export function IncidentFeed({ incidents, scores, onSelectIncident }: IncidentFeedProps) {

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-[#1e1e1e] bg-[#141414] py-16 text-center">
        <div className="h-8 w-8 rounded-full bg-[#1e1e1e] flex items-center justify-center">
          <Circle size={16} color="#7c7c7c" />
        </div>
        <p className="text-[14px] text-[#a7a7a7]" style={{ fontFamily: "var(--font-inter)" }}>
          No incidents detected yet. All providers appear honest.
        </p>
        <p className="eyebrow text-[#a7a7a7]">MONITORING IN PROGRESS</p>
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
              onClick={() => setSelectedId(selectedId === incident.id ? null : incident.id)}
              className="w-full rounded-[8px] bg-[#141414] border border-[#1e1e1e] px-5 py-3.5 flex items-center gap-4 text-left hover:border-[#313131] hover:bg-[#1e1e1e]/50 transition-all duration-200 ease-out"
              aria-expanded={selectedId === incident.id}
              id={`incident-row-${incident.id}`}
            >
              <Icon
                size={16}
                color={incident.kind === "DEVIANT" ? "#ff6b6b" : incident.kind === "STALE" ? "#ffc04d" : incident.kind === "CENSORING" ? "#6798ff" : "#7c7c7c"}
                aria-hidden="true"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={KIND_LABEL_CLASS[incident.kind] ?? "badge-down"}>
                    {incident.kind}
                  </span>
                  <span
                    className="text-[13px] text-white truncate"
                    style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
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
                  className="flex items-center gap-1 text-[12px] text-[#6798ff] hover:text-white transition-colors"
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
