"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Spinner,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { canonicalize, determineConsensus } from "@/lib/engine/consensus";
import { sha256 } from "@/lib/engine/hash";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type CheckState = "idle" | "loading" | "pass" | "fail";

interface VerifyCheck {
  label: string;
  detail: string;
  state: CheckState;
}

interface EvidenceBundle {
  incidentId: string;
  kind: string;
  providerId: string;
  pinnedBlockHex: string | null;
  request: unknown;
  expected: string | null;
  got: string | null;
  battery: unknown;
  consensusHash: string | null;
  merkleRoot: string | null;
  receipts: unknown;
  timestamp: string;
}

const ENTRY = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { ease: "easeOut" as const, duration: 0.55 },
};

// Contract details
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0xB62090c4a3cE28EBD12a71c92012b519a576F138") as `0x${string}`;

// Merkle verification helper
async function verifyProofInBrowser(
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

export default function VerifyPage() {
  const [incidentId, setIncidentId] = useState("");
  const [evidence, setEvidence] = useState<EvidenceBundle | null>(null);
  
  // Proof states
  const [proof, setProof] = useState<string[]>([]);
  const [leafIndex, setLeafIndex] = useState<number>(-1);
  const [leafObject, setLeafObject] = useState<any>(null);

  const [checks, setChecks] = useState<VerifyCheck[]>([
    { label: "Browser consensus matches server verdict", detail: "", state: "idle" },
    { label: "Merkle proof validates leaf against on-chain root", detail: "", state: "idle" },
    { label: "Consensus hash matches public RPC state at pinned block", detail: "", state: "idle" },
  ]);
  const [phase, setPhase] = useState<"input" | "evidence" | "computing" | "done">("input");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const didAutoload = useRef(false);

  // ── Step 1: Fetch evidence from /api/evidence ─────────
  const loadEvidence = useCallback(async (idOverride?: string) => {
    const targetId = (idOverride ?? incidentId).trim();
    if (!targetId) return;
    setFetchError(null);
    setPhase("evidence");

    try {
      const res = await fetch(`/api/evidence?id=${encodeURIComponent(targetId)}&proof=true`);
      if (!res.ok) {
        const err = await res.json();
        setFetchError(err.error ?? "Failed to fetch evidence");
        setPhase("input");
        return;
      }
      const data = await res.json();
      setEvidence(data.evidence);
      setProof(data.proof ?? []);
      setLeafIndex(data.leafIndex ?? -1);
      setLeafObject(data.leafObject ?? null);
    } catch {
      setFetchError("Network error — could not reach the evidence API");
      setPhase("input");
    }
  }, [incidentId]);

  useEffect(() => {
    if (didAutoload.current) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    didAutoload.current = true;
    setIncidentId(id);
    void loadEvidence(id);
  }, [loadEvidence]);

  // ── Step 2: Run browser consensus + chain verification ─
  const runVerify = useCallback(async () => {
    if (!evidence) return;
    setPhase("computing");

    const update = (i: number, state: CheckState, detail: string) => {
      setChecks((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], state, detail };
        return next;
      });
    };

    // Set all to loading
    setChecks((prev) => prev.map((c) => ({ ...c, state: "loading" })));

    // Fetch active providers for weights
    let allProviders: any[] = [];
    try {
      const provRes = await fetch("/api/providers");
      if (provRes.ok) {
        allProviders = await provRes.json();
      }
    } catch (err) {
      console.warn("Could not fetch provider registry, falling back to equal weights", err);
    }

    // ── Check 1: Browser consensus math ──────────────────
    try {
      if (evidence.battery && Array.isArray(evidence.battery)) {
        const responses = (evidence.battery as Array<{
          providerId: string;
          balance: unknown;
          latencyMs: number;
          status: "ok" | "timeout" | "error";
        }>).map((b) => ({
          providerId: b.providerId,
          result: b.balance,
          latencyMs: b.latencyMs,
          status: b.status,
        }));

        // Build independence weights based on operator groups in registry
        const weights: Record<string, number> = {};
        responses.forEach((r) => {
          const provider = allProviders.find((p) => p.id === r.providerId);
          if (provider && provider.operator) {
            const sameOperatorCount = allProviders.filter(
              (p) => p.operator === provider.operator
            ).length;
            weights[r.providerId] = 1 / (sameOperatorCount || 1);
          } else {
            weights[r.providerId] = 1; // equal weight fallback
          }
        });

        const browserResult = await determineConsensus(responses, weights);
        const serverHash = evidence.consensusHash;
        const match = browserResult.truthHash === serverHash;

        update(
          0,
          match ? "pass" : "fail",
          match
            ? `Browser consensus matches Server hash: ${browserResult.truthHash?.slice(0, 16)}...`
            : `Mismatch. Browser: ${browserResult.truthHash?.slice(0, 12)}... Server: ${serverHash?.slice(0, 12)}...`
        );
      } else {
        update(0, "fail", "No battery data available in evidence bundle");
      }
    } catch (e) {
      update(0, "fail", `Computation error: ${String(e)}`);
    }

    // ── Check 2: Merkle proof & On-chain root ─────────────
    try {
      if (evidence.merkleRoot && leafObject && leafIndex !== -1 && proof.length > 0) {
        // Re-hash leaf object in browser
        const calculatedLeaf = await canonicalize(leafObject);
        const proofValid = await verifyProofInBrowser(calculatedLeaf, proof, evidence.merkleRoot, leafIndex);

        if (!proofValid) {
          update(1, "fail", "Merkle proof does not hash up to the server's committed root");
        } else {
          // Connect to Sepolia to verify root is on-chain
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
            fromBlock: 6000000n, // Sepolia start
          });

          if (logs.length > 0) {
            update(1, "pass", `Validated on Sepolia (tx ${logs[0].transactionHash?.slice(0, 12)}...)`);
          } else {
            update(1, "fail", `Merkle root valid, but not committed on-chain at ${CONTRACT_ADDRESS.slice(0, 10)}...`);
          }
        }
      } else {
        update(1, "fail", "Missing Merkle root, proof, or leaf object in bundle");
      }
    } catch (e) {
      update(1, "fail", `Merkle / Chain error: ${String(e)}`);
    }

    // ── Check 3: Public RPC Block Verification ────────────
    try {
      if (evidence.pinnedBlockHex) {
        // Re-query block state directly from a public endpoint to verify capture honesty
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

        if (!rpcRes.ok) throw new Error("Public RPC query failed");
        const rpcJson = await rpcRes.json();

        if (rpcJson.error) {
          throw new Error("RPC error: " + String(rpcJson.error.message || rpcJson.error));
        }

        const balanceVal = rpcJson.result;
        const balanceHash = await canonicalize(balanceVal);

        if (balanceHash === evidence.consensusHash) {
          update(2, "pass", `Cloudflare balance verification matched stored consensus hash: ${balanceHash.slice(0, 16)}...`);
        } else {
          update(2, "fail", `RPC capture mismatch. Cloudflare: ${balanceHash.slice(0, 12)}... Stored: ${evidence.consensusHash?.slice(0, 12)}...`);
        }
      } else {
        update(2, "fail", "No pinned block hex available for re-query");
      }
    } catch (e) {
      update(2, "fail", `RPC verification error: ${String(e)}`);
    }

    setPhase("done");
  }, [evidence, proof, leafIndex, leafObject]);

  const allPassed = checks.every((c) => c.state === "pass");
  const anyFailed = checks.some((c) => c.state === "fail");

  return (
    <>
      <Navbar />
      <main
        role="main"
        className="relative blueprint-grid min-h-[100dvh] pt-28"
      >
        <div className="mx-auto max-w-[720px] px-6 py-20">
          {/* Header */}
          <motion.div {...ENTRY} className="mb-12 text-center">
            <p className="eyebrow mb-4">VERIFIABLE AUDIT ENGINE</p>
            <h1
              className="text-[40px] font-medium text-white mb-4"
              style={{
                fontFamily: "var(--font-inter)",
                letterSpacing: "-0.84px",
                lineHeight: "1.2",
              }}
            >
              Verify a Server Claim
            </h1>
            <p
              className="mx-auto max-w-[480px] text-[16px] text-[#a7a7a7] leading-[1.5]"
              style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
            >
              Paste an incident ID. This page fetches raw evidence, recomputes
              the consensus math in your browser, and compares against the
              on-chain commitment.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            {...ENTRY}
            transition={{ ease: "easeOut" as const, duration: 0.55, delay: 0.1 }}
            className="card mb-8"
          >
            <label
              htmlFor="incident-id-input"
              className="eyebrow block mb-3"
            >
              INCIDENT ID
            </label>
            <div className="flex gap-3">
              <input
                id="incident-id-input"
                type="text"
                value={incidentId}
                onChange={(e) => setIncidentId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadEvidence()}
                placeholder="uuid-xxxx-xxxx-xxxx"
                className="flex-1 rounded-[8px] border border-[#313131] bg-[#0a0a0a] px-4 py-2.5 text-[14px] text-white placeholder-[#454545] outline-none focus:border-[#6798ff] transition-colors"
                style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                disabled={phase !== "input"}
                aria-describedby={fetchError ? "fetch-error-msg" : undefined}
              />
              <button
                onClick={() => loadEvidence()}
                disabled={phase !== "input" || !incidentId.trim()}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                id="load-evidence-btn"
              >
                Load Evidence
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>
            {fetchError && (
              <p
                id="fetch-error-msg"
                className="mt-3 text-[13px] text-[#ff6b6b]"
                style={{ fontFamily: "var(--font-inter)" }}
                role="alert"
              >
                {fetchError}
              </p>
            )}
          </motion.div>

          {/* Evidence bundle display */}
          <AnimatePresence>
            {evidence && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.45 }}
                className="card mb-8"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="eyebrow">RAW EVIDENCE BUNDLE</p>
                  <span className={`badge-${evidence.kind.toLowerCase() as "deviant" | "stale" | "censoring" | "down"}`}>
                    {evidence.kind}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: "INCIDENT ID", value: evidence.incidentId.slice(0, 16) + "..." },
                    { label: "PROVIDER", value: evidence.providerId },
                    { label: "PINNED BLOCK", value: evidence.pinnedBlockHex ?? "N/A" },
                    { label: "TIMESTAMP", value: new Date(evidence.timestamp).toLocaleString() },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="eyebrow text-[10px] mb-1">{item.label}</p>
                      <p
                        className="text-[12px] text-[#a7a7a7] break-all"
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <p className="eyebrow text-[10px] mb-2">CONSENSUS HASH (server claim)</p>
                  <code
                    className="block text-[12px] text-[#6798ff] break-all"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {evidence.consensusHash ?? "null"}
                  </code>
                </div>

                {/* Curl reproduction */}
                {evidence.pinnedBlockHex && (
                  <div>
                    <p className="eyebrow text-[10px] mb-2">REPRODUCE THIS CHECK</p>
                    <div className="rounded-[8px] border border-[#313131] bg-[#0a0a0a] p-3">
                      <code
                        className="text-[11px] text-[#a7a7a7] break-all"
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        {`curl -s -X POST -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","${evidence.pinnedBlockHex}"]}' \\\n  <YOUR_RPC_URL>`}
                      </code>
                    </div>
                  </div>
                )}

                <button
                  onClick={runVerify}
                  disabled={phase === "computing" || phase === "done"}
                  className="btn-primary mt-5 disabled:opacity-40 disabled:cursor-not-allowed"
                  id="run-verify-btn"
                >
                  {phase === "computing" ? (
                    <>
                      <Spinner size={14} className="animate-spin" />
                      Recomputing...
                    </>
                  ) : (
                    "Recompute in Browser"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3-check results */}
          <AnimatePresence>
            {(phase === "computing" || phase === "done") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.45 }}
                className="card"
              >
                <p className="eyebrow mb-6">VERIFICATION RESULT</p>

                <div className="flex flex-col gap-4">
                  {checks.map((check, i) => (
                    <motion.div
                      key={check.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12, ease: [0.23, 1, 0.32, 1], duration: 0.4 }}
                      className="flex items-start gap-4"
                    >
                      <div className="shrink-0 mt-0.5">
                        {check.state === "loading" && (
                          <Spinner size={20} color="#a7a7a7" className="animate-spin" />
                        )}
                        {check.state === "idle" && (
                          <div className="h-5 w-5 rounded-full border border-[#313131]" />
                        )}
                        {check.state === "pass" && (
                          <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                          >
                            <CheckCircle size={20} color="#57d9a3" weight="fill" />
                          </motion.div>
                        )}
                        {check.state === "fail" && (
                          <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                          >
                            <XCircle size={20} color="#ff6b6b" weight="fill" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className="text-[14px] font-medium text-white"
                          style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                        >
                          {check.label}
                        </p>
                        {check.detail && (
                          <p
                            className="mt-1 text-[12px] text-[#7c7c7c]"
                            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                          >
                            {check.detail}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Final verdict */}
                <AnimatePresence>
                  {phase === "done" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, ease: [0.23, 1, 0.32, 1], duration: 0.45 }}
                      className={`mt-8 rounded-[12px] border p-5 ${
                        allPassed
                          ? "border-[#57d9a3]/25 bg-[#57d9a3]/[0.06]"
                          : "border-[#ff6b6b]/25 bg-[#ff6b6b]/[0.06]"
                      }`}
                    >
                      <p
                        className="text-[15px] font-medium"
                        style={{
                          fontFamily: "var(--font-inter)",
                          letterSpacing: "-0.25px",
                          color: allPassed ? "#57d9a3" : "#ff6b6b",
                        }}
                      >
                        {allPassed
                          ? "Server is mathematically honest. The claim is verified."
                          : "Verification failed. One or more checks did not pass."}
                      </p>
                      <p
                        className="mt-2 text-[13px] text-[#7c7c7c]"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {allPassed
                          ? "Browser math matches server verdict matches on-chain commitment. The data chain is intact."
                          : "Review the failed checks above. This may indicate a stale Merkle root or a genuine server inconsistency."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </>
  );
}
