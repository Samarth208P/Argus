import { NextRequest, NextResponse } from "next/server";
import { getIncidentById, getPollById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing ?id= query parameter" },
      { status: 400 }
    );
  }

  try {
    const incident = await getIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Also fetch the associated poll for the raw battery data
    const poll = incident.poll_id ? await getPollById(incident.poll_id) : null;

    return NextResponse.json({
      incident,
      poll,
      // This is the raw evidence bundle that /verify will recompute
      evidence: {
        incidentId: incident.id,
        kind: incident.kind,
        providerId: incident.provider_id,
        pinnedBlockHex: poll?.pinned_block_hex ?? null,
        request: incident.request,
        expected: incident.expected,
        got: incident.got,
        battery: poll?.battery ?? null,
        consensusHash: poll?.consensus_hash ?? null,
        merkleRoot: poll?.merkle_root ?? null,
        receipts: incident.receipts,
        timestamp: incident.t,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
