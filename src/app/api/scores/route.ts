import { NextResponse } from "next/server";
import { getLatestScores } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// Read-only endpoint powering the live-refresh polling on the landing
// showcase and the /rpcs leaderboard. Returns the latest score per provider.
export async function GET() {
  try {
    const scores = await getLatestScores();
    return NextResponse.json(scores, {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" },
    });
  } catch (err) {
    return NextResponse.json({ error: "scores unavailable", detail: String(err) }, { status: 503 });
  }
}
