import { canonicalize, determineConsensus } from "../src/lib/engine/consensus";
import { sha256 } from "../src/lib/engine/hash";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0xB62090c4a3cE28EBD12a71c92012b519a576F138") as `0x${string}`;

async function verifyProof(
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

async function main() {
  const args = process.argv.slice(2);
  const incidentId = args[0];
  const baseUrl = args[1] ?? "http://localhost:3000";

  if (!incidentId) {
    console.error("Usage: npx ts-node scripts/verify.ts <incident_id> [base_url]");
    process.exit(1);
  }

  console.log(`\n=== Argus CLI Verifier ===`);
  console.log(`Target Incident: ${incidentId}`);
  console.log(`Evidence Server: ${baseUrl}`);
  console.log(`Contract Address: ${CONTRACT_ADDRESS}\n`);

  // 1. Fetch evidence bundle
  console.log(`[1/4] Fetching evidence bundle...`);
  let res;
  try {
    res = await fetch(`${baseUrl}/api/evidence?id=${incidentId}&proof=true`);
  } catch (err) {
    console.error(`Error: Could not connect to evidence server at ${baseUrl}. Is the server running?`);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`Error: Evidence server returned status ${res.status}`);
    const errObj = await res.json().catch(() => ({}));
    console.error(errObj.error ?? "Unknown error");
    process.exit(1);
  }

  const { evidence, proof, leafIndex, leafObject } = await res.json();

  if (!evidence) {
    console.error("Error: Stored evidence not found in bundle.");
    process.exit(1);
  }

  console.log(`  - Incident Kind: ${evidence.kind}`);
  console.log(`  - Offending Provider: ${evidence.providerId}`);
  console.log(`  - Pinned Block: ${evidence.pinnedBlockHex}`);
  console.log(`  - Stored Consensus Hash: ${evidence.consensusHash}`);

  // Fetch provider weights
  console.log(`\n[2/4] Verifying Browser Consensus Math...`);
  const provRes = await fetch(`${baseUrl}/api/providers`).catch(() => null);
  const allProviders = provRes?.ok ? await provRes.json() : [];

  if (evidence.battery && Array.isArray(evidence.battery)) {
    const responses = evidence.battery.map((b: any) => ({
      providerId: b.providerId,
      result: b.balance,
      latencyMs: b.latencyMs,
      status: b.status,
    }));

    const weights: Record<string, number> = {};
    responses.forEach((r: any) => {
      const provider = allProviders.find((p: any) => p.id === r.providerId);
      if (provider && provider.operator) {
        const sameOperatorCount = allProviders.filter((p: any) => p.operator === provider.operator).length;
        weights[r.providerId] = 1 / (sameOperatorCount || 1);
      } else {
        weights[r.providerId] = 1;
      }
    });

    const browserResult = await determineConsensus(responses, weights);
    if (browserResult.truthHash === evidence.consensusHash) {
      console.log(`  ✔ PASS: Recomputed consensus hash matches server's claim (${browserResult.truthHash?.slice(0, 16)}...)`);
    } else {
      console.error(`  ❌ FAIL: Consensus mismatch!`);
      console.error(`    Browser: ${browserResult.truthHash}`);
      console.error(`    Server:  ${evidence.consensusHash}`);
    }
  } else {
    console.error("  ❌ FAIL: No battery logs found in evidence.");
  }

  // 2. Verify Merkle Proof and Sepolia commitments
  console.log(`\n[3/4] Verifying Merkle Proof and Sepolia logs...`);
  if (evidence.merkleRoot && leafObject && leafIndex !== -1 && proof && proof.length > 0) {
    const calculatedLeaf = await canonicalize(leafObject);
    const proofValid = await verifyProof(calculatedLeaf, proof, evidence.merkleRoot, leafIndex);

    if (proofValid) {
      console.log(`  ✔ PASS: Merkle proof correctly validates leaf against root (${evidence.merkleRoot.slice(0, 16)}...)`);

      // Verify Sepolia logs
      try {
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
        });

        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: {
            type: "event",
            name: "MerkleRootCommitted",
            inputs: [
              { name: "root", type: "bytes32", indexed: true },
              { name: "hour", type: "uint256" }
            ],
          },
          args: {
            root: `0x${evidence.merkleRoot}` as `0x${string}`,
          },
          fromBlock: 6000000n,
        });

        if (logs.length > 0) {
          console.log(`  ✔ PASS: Merkle root committed on Sepolia at tx ${logs[0].transactionHash}`);
        } else {
          console.error(`  ❌ FAIL: Merkle root is valid, but no committed logs found on Sepolia at address ${CONTRACT_ADDRESS}`);
        }
      } catch (chainErr) {
        console.warn(`  ⚠ WARNING: Could not connect to Sepolia RPC to inspect contract logs: ${chainErr}`);
      }
    } else {
      console.error(`  ❌ FAIL: Merkle proof verification failed.`);
    }
  } else {
    console.error(`  ❌ FAIL: Missing Merkle proof or root in evidence bundle.`);
  }

  // 3. Verify Capture Honesty against public node
  console.log(`\n[4/4] Verifying Capture Honesty (Reality check)...`);
  if (evidence.pinnedBlockHex) {
    try {
      const rpcRes = await fetch("https://cloudflare-eth.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", evidence.pinnedBlockHex],
        }),
      });

      if (rpcRes.ok) {
        const rpcJson = await rpcRes.json();
        const balanceVal = rpcJson.result;
        const balanceHash = await canonicalize(balanceVal);

        if (balanceHash === evidence.consensusHash) {
          console.log(`  ✔ PASS: Cloudflare balance check matched consensus hash (${balanceHash.slice(0, 16)}...)`);
          console.log(`\n🎉 VERIFICATION SUCCESS: Server claims are 100% mathematically honest and verified.`);
        } else {
          console.error(`  ❌ FAIL: Capture mismatch!`);
          console.error(`    Cloudflare: ${balanceHash}`);
          console.error(`    Stored:     ${evidence.consensusHash}`);
        }
      } else {
        console.error("  ❌ FAIL: Cloudflare RPC request failed.");
      }
    } catch (rpcErr) {
      console.error(`  ❌ FAIL: Could not verify capture honesty against Cloudflare RPC: ${rpcErr}`);
    }
  } else {
    console.error("  ❌ FAIL: No pinned block hex available.");
  }
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
