import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  getLatestScores,
  getProviders,
  getScoreHistory,
  getRecentScoreRows,
  getRecentIncidents,
} from "@/lib/db/queries";
import { rankRPCs, METRICS, scoreColor, providerLabel, initials } from "@/lib/rpc";
import type { DbScore } from "@/lib/db/types";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} — RPC details · Argus` };
}

/** Rank-over-time from timestamped rows (real; empty when history is sparse). */
function computeRankHistory(rows: DbScore[], providerId: string) {
  const byTime = new Map<number, DbScore[]>();
  for (const r of rows) {
    const t = new Date(r.t).getTime();
    const arr = byTime.get(t) ?? [];
    arr.push(r);
    byTime.set(t, arr);
  }
  const points: { t: number; rank: number; total: number }[] = [];
  for (const [t, group] of Array.from(byTime.entries()).sort((a, b) => a[0] - b[0])) {
    const sorted = [...group].sort((a, b) => b.score - a.score || a.latency_avg - b.latency_avg);
    const idx = sorted.findIndex((r) => r.provider_id === providerId);
    if (idx >= 0) points.push({ t, rank: idx + 1, total: sorted.length });
  }
  return points;
}

export default async function RpcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [scores, providers, history, recentRows, incidents] = await Promise.all([
    getLatestScores(),
    getProviders(),
    getScoreHistory(id, 60),
    getRecentScoreRows(600),
    getRecentIncidents(80),
  ]);

  const ranked = rankRPCs(scores, providers);
  const me = ranked.find((r) => r.provider_id === id);
  if (!me) notFound();

  const sc = scoreColor(me.score);
  const label = providerLabel(me);
  const rankHistory = computeRankHistory(recentRows, id);
  const myIncidents = incidents.filter((i) => i.provider_id === id).slice(0, 6);

  const scorePts = history.map((h) => ({ t: new Date(h.t).getTime(), v: h.score }));
  const latPts = history.map((h) => ({ t: new Date(h.t).getTime(), v: h.latency_avg }));

  return (
    <>
      <Navbar />
      <main role="main" className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] aurora opacity-50" />
        <div className="container-page pt-[112px] pb-20 sm:pt-[144px]">
          <Link href="/rpcs" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#7c7c82] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
            <ArrowLeft size={13} /> All RPCs
          </Link>

          {/* Header */}
          <div className="flex flex-col gap-6 border-b border-white/8 pb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.03] text-[16px] font-semibold text-[#6798ff]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{initials(me)}</span>
              <div>
                <h1 className="text-[32px] font-semibold text-white" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.8px" }}>{label}</h1>
                <p className="mt-1 text-[13px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  {me.provider?.operator ?? "unknown"} · {me.provider?.type ?? "node"} · {me.provider?.network ?? "mainnet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[11px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Rank</p>
                <p className="text-[34px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-1px" }}>#{me.rank}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[1px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Integrity</p>
                <p className="text-[34px] font-semibold tnum" style={{ color: sc, fontFamily: "var(--font-inter)", letterSpacing: "-1px" }}>{me.score}</p>
              </div>
            </div>
          </div>

          {/* Metric tiles */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["latency_avg", "accuracy", "uptime", "freshness_score"] as const).map((k) => (
              <div key={k} className="rounded-[12px] border border-white/8 bg-[#0f0f12] p-5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{METRICS[k].label}</p>
                <p className="text-[24px] font-semibold text-white tnum" style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.6px" }}>{METRICS[k].format(me)}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Integrity score" subtitle="score /100" domain={[0, 100]} points={scorePts} color={sc} />
            <ChartCard title="Latency" subtitle="ms" points={latPts} color="#6798ff" />
            <RankHistoryCard points={rankHistory} />
          </div>

          {/* Endpoint + incidents */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {me.provider?.url && (
              <div className="rounded-[12px] border border-white/8 bg-[#0f0f12] p-5">
                <p className="mb-2 text-[11px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Endpoint</p>
                <a href={me.provider.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all text-[13px] text-[#6798ff] transition-colors hover:text-white" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
                  {me.provider.url}
                  <ArrowUpRight size={13} className="shrink-0" />
                </a>
              </div>
            )}
            <div className="rounded-[12px] border border-white/8 bg-[#0f0f12] p-5 lg:col-span-2">
              <p className="mb-3 text-[11px] uppercase tracking-[0.8px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Recent incidents</p>
              {myIncidents.length ? (
                <ul className="flex flex-col gap-2">
                  {myIncidents.map((i) => (
                    <li key={i.id} className="flex items-center gap-3">
                      <span className={`badge-${i.kind.toLowerCase()}`}>{i.kind}</span>
                      <Link href={`/verify?id=${i.id}`} className="text-[13px] text-[#a5a5ac] transition-colors hover:text-white" style={{ fontFamily: "var(--font-inter)" }}>
                        Evidence · {new Date(i.t).toLocaleString()}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-[#57d9a3]" style={{ fontFamily: "var(--font-inter)" }}>No incidents recorded. This provider has stayed honest.</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ── Server-rendered mini line chart ──────────────────────── */
function ChartCard({ title, subtitle, points, color, domain }: { title: string; subtitle: string; points: { t: number; v: number }[]; color: string; domain?: [number, number] }) {
  const w = 320, h = 120, pad = 6;
  const enough = points.length >= 2;
  const vals = points.map((p) => p.v);
  const yMin = domain ? domain[0] : Math.min(...vals) * 0.95;
  const yMax = domain ? domain[1] : Math.max(...vals) * 1.05 || 1;
  const tMin = points.length ? points[0].t : 0;
  const tMax = points.length ? points[points.length - 1].t : 1;
  const xOf = (t: number) => pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2);
  const yOf = (v: number) => pad + (1 - (v - yMin) / (yMax - yMin || 1)) * (h - pad * 2);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(" ");
  const area = enough ? `${line} L${xOf(tMax)},${h - pad} L${xOf(tMin)},${h - pad} Z` : "";
  const gid = `g-${title.replace(/\s/g, "")}`;

  return (
    <div className="rounded-[12px] border border-white/8 bg-[#0f0f12] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>{title}</p>
        <p className="text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{subtitle}</p>
      </div>
      {enough ? (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <div className="flex h-[120px] items-center justify-center text-[12px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Not enough history yet</div>
      )}
    </div>
  );
}

function RankHistoryCard({ points }: { points: { t: number; rank: number; total: number }[] }) {
  const w = 320, h = 120, pad = 10;
  const enough = points.length >= 3;
  const maxRank = Math.max(...points.map((p) => p.total), 5);
  const tMin = points.length ? points[0].t : 0;
  const tMax = points.length ? points[points.length - 1].t : 1;
  const xOf = (t: number) => pad + ((t - tMin) / (tMax - tMin || 1)) * (w - pad * 2);
  const yOf = (r: number) => pad + ((r - 1) / (maxRank - 1 || 1)) * (h - pad * 2); // rank 1 at top
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.rank).toFixed(1)}`).join(" ");

  return (
    <div className="rounded-[12px] border border-white/8 bg-[#0f0f12] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-white" style={{ fontFamily: "var(--font-inter)" }}>Rank over time</p>
        <p className="text-[11px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>1 = best</p>
      </div>
      {enough ? (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
          <path d={line} fill="none" stroke="#c98cff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={xOf(p.t)} cy={yOf(p.rank)} r={i === points.length - 1 ? 3 : 1.6} fill="#c98cff" />
          ))}
        </svg>
      ) : (
        <div className="flex h-[120px] items-center justify-center text-center text-[12px] text-[#54545a]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>Rank history builds<br />as Argus polls</div>
      )}
    </div>
  );
}
