import { NextResponse } from "next/server";
import { selectRoute } from "@/lib/engine/router";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const decision = await selectRoute();
    return NextResponse.json(decision, {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Router error", detail: String(err) },
      { status: 500 }
    );
  }
}
