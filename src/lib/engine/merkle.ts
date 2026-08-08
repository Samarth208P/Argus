import { canonicalize } from "./consensus";
import { sha256 } from "./hash";
import { getPollsByHour, updatePollsMerkleRoot, getPollsWithoutMerkleRoot } from "../db/queries";
import { commitMerkleRootOnChain } from "./attestationWriter";

// ── Leaf Hash Computation ────────────────────────────────
export async function computePollLeaf(poll: {
  id: string;
  pinned_block_hex: string;
  consensus_hash: string | null;
  status: string;
  battery: unknown;
}): Promise<string> {
  const leafObject = {
    id: poll.id,
    pinned_block_hex: poll.pinned_block_hex,
    consensus_hash: poll.consensus_hash,
    status: poll.status,
    battery: poll.battery,
  };
  return canonicalize(leafObject);
}

// ── Build Merkle Tree ─────────────────────────────────────
export async function buildMerkleTree(leaves: string[]): Promise<string[][]> {
  if (leaves.length === 0) return [[]];
  const levels: string[][] = [leaves];

  while (levels[levels.length - 1].length > 1) {
    const currentLevel = levels[levels.length - 1];
    const nextLevel: string[] = [];
    const hashPromises: Promise<string>[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left; // duplicate if odd
      hashPromises.push(sha256(left + right));
    }

    const resolved = await Promise.all(hashPromises);
    nextLevel.push(...resolved);
    levels.push(nextLevel);
  }

  return levels;
}

// ── Generate Proof ───────────────────────────────────────
export function getMerkleProof(tree: string[][], index: number): string[] {
  const proof: string[] = [];
  let currIndex = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const currentLevel = tree[level];
    const isRight = currIndex % 2 === 1;
    const siblingIndex = isRight ? currIndex - 1 : currIndex + 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    } else {
      proof.push(currentLevel[currIndex]);
    }
    currIndex = Math.floor(currIndex / 2);
  }

  return proof;
}

// ── Verify Proof ─────────────────────────────────────────
export async function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string,
  index: number
): Promise<boolean> {
  let current = leaf;
  let currIndex = index;

  for (const sibling of proof) {
    const isRight = currIndex % 2 === 1;
    const combined = isRight ? sibling + current : current + sibling;
    current = await sha256(combined);
    currIndex = Math.floor(currIndex / 2);
  }

  return current === root;
}

// ── Hourly Notarization Engine ───────────────────────────
// Finds any closed hour containing polls with null merkle_root,
// builds its Merkle tree, commits it on-chain, and updates DB.
export async function processPendingMerkleRoots(): Promise<void> {
  const now = new Date();
  // An hour is closed if we are in a subsequent hour.
  // Pinned threshold is the start of the current hour.
  const currentHourStart = new Date(now);
  currentHourStart.setMinutes(0, 0, 0);
  currentHourStart.setMilliseconds(0);

  // Fetch all polls without a Merkle root created before the current hour
  const pendingPolls = await getPollsWithoutMerkleRoot(currentHourStart.toISOString());
  if (pendingPolls.length === 0) return;

  // Group pending polls by hour key
  const hoursMap = new Map<string, Date>();
  for (const p of pendingPolls) {
    const d = new Date(p.t);
    d.setMinutes(0, 0, 0);
    d.setMilliseconds(0);
    hoursMap.set(d.toISOString(), d);
  }

  for (const [hourStr, hourDate] of hoursMap.entries()) {
    console.log(`[MerkleEngine] Processing closed hour: ${hourStr}`);
    // Fetch all polls for this hour (to make sure we build the complete tree)
    const hourPolls = await getPollsByHour(hourDate);
    if (hourPolls.length === 0) continue;

    // Sort deterministically by t and id
    hourPolls.sort((a, b) => {
      const cmpT = new Date(a.t).getTime() - new Date(b.t).getTime();
      if (cmpT !== 0) return cmpT;
      return a.id.localeCompare(b.id);
    });

    // Compute leaves
    const leaves: string[] = [];
    for (const p of hourPolls) {
      const leaf = await computePollLeaf(p);
      leaves.push(leaf);
    }

    // Build tree
    const tree = await buildMerkleTree(leaves);
    const root = tree[tree.length - 1][0];

    if (!root) {
      console.error(`[MerkleEngine] Failed to compute root for hour: ${hourStr}`);
      continue;
    }

    console.log(`[MerkleEngine] Hourly Merkle Root: 0x${root}. Committing on-chain...`);

    // Commit to Sepolia contract
    const txHash = await commitMerkleRootOnChain(root);
    if (txHash) {
      console.log(`[MerkleEngine] Root committed! Tx: ${txHash}. Updating database...`);
      // Update all polls in this hour with the committed Merkle root
      const pollIds = hourPolls.map((p) => p.id);
      await updatePollsMerkleRoot(pollIds, root);
      console.log(`[MerkleEngine] Successfully updated ${pollIds.length} polls in DB.`);
    } else {
      console.warn(`[MerkleEngine] On-chain commitment failed or skipped for hour: ${hourStr}`);
    }
  }
}
