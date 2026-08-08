import { NextRequest, NextResponse } from "next/server";
import { getProviders, upsertProvider } from "@/lib/db/queries";
import { MAINNET_PROVIDERS } from "@/lib/engine/registry";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const dbProviders = await getProviders();
    // Merge built-ins that aren't in DB
    const dbIds = new Set(dbProviders.map((p) => p.id));
    const builtIns = MAINNET_PROVIDERS
      .filter((p) => !dbIds.has(p.id))
      .map((p) => ({
        id: p.id, url: p.url, label: p.label, operator: p.operator,
        type: p.type, is_sim: false, network: p.network, created_at: new Date().toISOString(),
      }));
    return NextResponse.json([...dbProviders, ...builtIns]);
  } catch {
    // Return built-ins if DB unavailable
    return NextResponse.json(
      MAINNET_PROVIDERS.map((p) => ({
        id: p.id, url: p.url, label: p.label, operator: p.operator,
        type: p.type, is_sim: false, network: p.network, created_at: new Date().toISOString(),
      }))
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { url: string; label: string; operator?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.url || !body.label) {
    return NextResponse.json({ error: "Missing url or label" }, { status: 400 });
  }

  try {
    new URL(body.url); // validate URL format
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const id = body.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/g, "-").slice(0, 30);
  try {
    await upsertProvider({
      id,
      url: body.url,
      label: body.label,
      operator: body.operator ?? "custom",
      type: "node",
      is_sim: false,
      network: "mainnet",
    });
    return NextResponse.json({ ok: true, id });
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
