import { NextRequest, NextResponse } from "next/server";
import { getAdversaryState, setAdversaryState, type AdversaryMode } from "@/lib/engine/adversaryState";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { mode: AdversaryMode | null; targetId: string | null; durationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.mode === null || body.targetId === null) {
    // Deactivate
    const state = setAdversaryState(null, null);
    return NextResponse.json({ ok: true, active: false, ...state });
  }

  if (!["stale", "mutate", "censor"].includes(body.mode ?? "")) {
    return NextResponse.json({ error: "Invalid mode. Use: stale | mutate | censor" }, { status: 400 });
  }

  const state = setAdversaryState(body.targetId, body.mode, body.durationSeconds ?? 120);

  return NextResponse.json({
    ok: true,
    active: true,
    ...state,
  });
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(getAdversaryState());
}
