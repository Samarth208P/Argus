// ============================================================
// On-chain Attestation Writer — PRD F-07 & F-08
// Submits sha256 incident digests and hourly Merkle roots
// to ArgusAttest contract on Sepolia using viem.
// ============================================================

import { createWalletClient, createPublicClient, http, hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { sha256 } from "./hash";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const PRIVATE_KEY = process.env.PROBE_PRIVATE_KEY as `0x${string}`;

// ABI of ArgusAttest
const ABI = [
  {
    type: "function",
    name: "logIncident",
    inputs: [{ name: "digest", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "commitMerkleRoot",
    inputs: [{ name: "root", type: "bytes32", internalType: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  }
] as const;

function getAccount() {
  if (!PRIVATE_KEY || typeof PRIVATE_KEY !== "string" || !PRIVATE_KEY.startsWith("0x") || PRIVATE_KEY.length !== 66) {
    return null;
  }
  try {
    return privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  } catch {
    return null;
  }
}

const account = getAccount();

const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";

const walletClient = account
  ? createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    })
  : null;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

// ── Log Incident On-chain ──────────────────────────────────
export async function logIncidentOnChain(incidentId: string, kind: string, providerId: string): Promise<string | null> {
  if (!walletClient || !account) {
    console.warn("Attestation skipped: PROBE_PRIVATE_KEY not set");
    return null;
  }

  try {
    // Generate incident digest: sha256(id + kind + providerId)
    const rawString = `${incidentId}:${kind}:${providerId}`;
    const digestHex = await sha256(rawString);
    const digest = `0x${digestHex}` as `0x${string}`;

    // Write to contract
    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "logIncident",
      args: [digest],
    });

    const hash = await walletClient.writeContract(request);
    return hash;
  } catch (err) {
    console.error("Failed to log incident on-chain:", err);
    return null;
  }
}

// ── Commit Merkle Root hourly ─────────────────────────────
export async function commitMerkleRootOnChain(rootHex: string): Promise<string | null> {
  if (!walletClient || !account) {
    console.warn("Merkle root commit skipped: PROBE_PRIVATE_KEY not set");
    return null;
  }

  try {
    const root = `0x${rootHex}` as `0x${string}`;

    const { request } = await publicClient.simulateContract({
      account,
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "commitMerkleRoot",
      args: [root],
    });

    const hash = await walletClient.writeContract(request);
    return hash;
  } catch (err) {
    console.error("Failed to commit Merkle root on-chain:", err);
    return null;
  }
}
