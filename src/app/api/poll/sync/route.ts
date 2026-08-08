import { NextResponse } from "next/server";
import { upsertScore, insertIncident } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { scores, incidents } = await req.json();
    
    if (scores && scores.length > 0) {
      for (const s of scores) {
        await upsertScore({
          id: s.id,
          t: s.t,
          provider_id: s.provider_id,
          score: s.score,
          accuracy: s.accuracy,
          uptime: s.uptime,
          latency_avg: s.latency_avg,
          freshness_score: s.freshness_score,
          trend: s.trend,
        });
      }
    }
    
    if (incidents && incidents.length > 0) {
      for (const inc of incidents) {
        await insertIncident({
          id: inc.id,
          t: inc.t,
          provider_id: inc.provider_id,
          kind: inc.kind,
          poll_id: inc.poll_id,
          request: inc.request,
          expected: inc.expected,
          got: inc.got,
          receipts: inc.receipts,
        });
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Failed to sync client metrics to server:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
