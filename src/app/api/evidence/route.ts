import { NextRequest, NextResponse } from "next/server";
import { getIncidentById, getPollById, getPollsByHour } from "@/lib/db/queries";
import { buildMerkleTree, getMerkleProof, computePollLeaf } from "@/lib/engine/merkle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const needProof = searchParams.get("proof") === "true";

  if (!id) {
    return NextResponse.json(
      {
        error: "Missing ?id= query parameter",
        message: "Use /api/evidence?id=<incidentId> to fetch evidence for a specific incident.",
      },
      { status: 200 }
    );
  }

  try {
    const incident = await getIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    // Also fetch the associated poll for the raw battery data
    const poll = incident.poll_id ? await getPollById(incident.poll_id) : null;

    let merkleProof: string[] = [];
    let leafIndex = -1;
    let leafObject: any = null;

    if (needProof && poll) {
      const hour = new Date(poll.t);
      const allPolls = await getPollsByHour(hour);

      if (allPolls.length > 0) {
        // Sort deterministically
        allPolls.sort((a, b) => {
          const cmpT = new Date(a.t).getTime() - new Date(b.t).getTime();
          if (cmpT !== 0) return cmpT;
          return a.id.localeCompare(b.id);
        });

        // Find index of current poll
        leafIndex = allPolls.findIndex((p) => p.id === poll.id);

        if (leafIndex !== -1) {
          // Compute leaf hashes
          const leaves: string[] = [];
          for (const p of allPolls) {
            const leaf = await computePollLeaf(p);
            leaves.push(leaf);
          }

          // Build tree and extract proof
          const tree = await buildMerkleTree(leaves);
          merkleProof = getMerkleProof(tree, leafIndex);

          // Build raw leaf object structure for client-side re-hashing
          leafObject = {
            id: poll.id,
            pinned_block_hex: poll.pinned_block_hex,
            consensus_hash: poll.consensus_hash,
            status: poll.status,
            battery: poll.battery,
          };
        }
      }
    }

    return NextResponse.json({
      incident,
      poll,
      proof: needProof ? merkleProof : undefined,
      leafIndex: needProof ? leafIndex : undefined,
      leafObject: needProof ? leafObject : undefined,
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
    console.error("Evidence API error:", err);
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 });
  }
}
