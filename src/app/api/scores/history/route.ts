import { NextRequest, NextResponse } from "next/server";
import { getScoreHistory } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider");
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(200, Math.trunc(limitParam)))
    : 50;

  if (!providerId) {
    return NextResponse.json(
      { error: "Missing ?provider= query parameter" },
      { status: 400 }
    );
  }

  try {
    const history = await getScoreHistory(providerId, limit);
    return NextResponse.json(history, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Score history unavailable", detail: String(err) },
      { status: 503 }
    );
  }
}
