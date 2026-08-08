"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUpRight, Copy, Check, ShieldCheck, Spinner } from "@phosphor-icons/react";
import Link from "next/link";
import type { DbIncident } from "@/lib/db/types";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS ?? "0xB62090c4a3cE28EBD12a71c92012b519a576F138") as `0x${string}`;

interface EvidenceDrawerProps {
  incidentId: string | null;
  open: boolean;
  onClose: () => void;
  incidents: DbIncident[];
}

export function EvidenceDrawer({ incidentId, open, onClose, incidents }: EvidenceDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Load evidence from props list
  useEffect(() => {
    if (!open || !incidentId) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const incident = incidents.find((i) => i.id === incidentId);
      if (!incident) throw new Error("Incident not found in client logs");
      
      const params = (incident.request as any)?.params || [];
      const pinnedBlockHex = params[1] || params[0] || "0x0";
      const mockPoll = {
        pinned_block_hex: pinnedBlockHex,
        status: "ok"
      };

      setData({ incident, poll: mockPoll });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [open, incidentId, incidents]);

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const curlCommand = data?.poll?.pinned_block_hex
    ? `curl -s -X POST -H "Content-Type: application/json" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045","${data.poll.pinned_block_hex}"]}' \\\n  <YOUR_RPC_URL>`
    : "";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ease: "easeOut", duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Incident evidence details"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ ease: [0.32, 0.72, 0, 1] as any, duration: 0.38 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] border-l border-white/5 bg-[#141414] flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-[#00f0ff]" />
                <div>
                  <h3
                    className="text-[15px] font-medium text-white"
                    style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
                  >
                    Incident Polygraph File
                  </h3>
                  <p
                    className="text-[11px] text-[#454545]"
                    style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                  >
                    {incidentId?.slice(0, 18)}...
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[#454545] hover:text-white transition-colors p-1"
                aria-label="Close evidence details"
                id="evidence-drawer-close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content loading state */}
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-20 text-[#7c7c7c]">
                <Spinner size={24} className="animate-spin" />
                <span
                  className="text-[12px] uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                >
                  Retrieving Logs...
                </span>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="flex-1 p-6 flex flex-col justify-center items-center text-center gap-4">
                <p className="text-[14px] text-red-400">{error}</p>
                <button onClick={onClose} className="btn-ghost text-[12px]">
                  Close
                </button>
              </div>
            )}

            {/* Main content */}
            {!loading && !error && data && (
              <div className="flex flex-col gap-6 p-6">
                {/* ID & Kind Badges */}
                <div className="flex items-center justify-between">
                  <span className={`badge-${data.incident.kind.toLowerCase()}`}>
                    {data.incident.kind}
                  </span>
                  <button
                    onClick={() => copyToClipboard(data.incident.id, setCopiedId)}
                    className="text-[11px] text-[#7c7c7c] hover:text-white flex items-center gap-1 font-mono transition-colors"
                  >
                    {copiedId ? (
                      <>
                        <Check size={11} className="text-[#4dffb0]" />
                        <span className="text-[#4dffb0]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Expected vs Got Comparison */}
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="eyebrow text-[10px] mb-1.5">Consensus Consensus Hash (Expected)</p>
                    <div className="rounded-[6px] border border-green-500/20 bg-green-500/5 p-3 font-mono text-[12px] text-green-400 break-all leading-normal">
                      {data.incident.expected ?? "null"}
                    </div>
                  </div>
                  <div>
                    <p className="eyebrow text-[10px] mb-1.5">Provider Response (Got)</p>
                    <div className="rounded-[6px] border border-red-500/20 bg-red-500/5 p-3 font-mono text-[12px] text-red-400 break-all leading-normal">
                      {data.incident.got ?? "TIMEOUT / NETWORK_ERROR"}
                    </div>
                  </div>
                </div>

                {/* Incident details info block */}
                <div className="grid grid-cols-2 gap-4 rounded-[8px] border border-white/5 bg-white/5 p-4">
                  {[
                    { label: "PROVIDER", value: data.incident.provider_id },
                    { label: "PINNED BLOCK", value: data.poll?.pinned_block_hex ?? "N/A" },
                    { label: "TIMESTAMP", value: new Date(data.incident.t).toLocaleString() },
                    { label: "STATUS", value: data.poll?.status ?? "ok" },
                  ].map((info) => (
                    <div key={info.label} className="min-w-0">
                      <p className="eyebrow text-[9px] text-[#454545] mb-1">{info.label}</p>
                      <p
                        className="text-[12px] text-white truncate font-medium"
                        style={{ fontFamily: "var(--font-outfit)" }}
                      >
                        {info.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Copier command */}
                {curlCommand && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="eyebrow text-[10px]">REPRODUCE RAW JSON-RPC</p>
                      <button
                        onClick={() => copyToClipboard(curlCommand, setCopiedCurl)}
                        className="text-[11px] text-[#7c7c7c] hover:text-white flex items-center gap-1 font-mono transition-colors"
                      >
                        {copiedCurl ? (
                          <>
                            <Check size={11} className="text-[#4dffb0]" />
                            <span className="text-[#4dffb0]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy curl</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="rounded-[8px] border border-white/5 bg-black/60 p-4 overflow-x-auto">
                      <pre className="text-[11px] text-[#7c7c7c] break-all whitespace-pre-wrap font-mono leading-[1.4]">
                        {curlCommand}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Chain verification receipts */}
                {data.incident.receipts && (
                  <div className="rounded-[8px] border border-white/5 bg-white/5 p-4 flex flex-col gap-3">
                    <p className="eyebrow text-[10px] text-[#454545]">Verifiable Receipts</p>
                    {data.incident.receipts.txHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${data.incident.receipts.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-[12px] text-[#6798ff] hover:text-white transition-colors"
                        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                      >
                        <span>Sepolia Attestation Tx</span>
                        <ArrowUpRight size={13} />
                      </a>
                    )}
                    <a
                      href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-[12px] text-[#6798ff] hover:text-white transition-colors"
                      style={{ fontFamily: "var(--font-jetbrains-mono)" }}
                    >
                      <span>ArgusAttest Contract</span>
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                )}

                {/* VERIFY button */}
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/verify?id=${data.incident.id}`}
                    className="btn-primary w-full justify-center py-3 text-[14px]"
                    id={`drawer-action-verify-${data.incident.id}`}
                  >
                    Launch Browser Audit
                  </Link>
                  <button
                    onClick={onClose}
                    className="btn-ghost w-full justify-center py-2.5 text-[13px]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
