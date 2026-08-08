import { NextRequest, NextResponse } from "next/server";
import { getLatestScores } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const scores = await getLatestScores();
    return NextResponse.json(scores);
  } catch (err) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
