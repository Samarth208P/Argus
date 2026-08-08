"use client";

import { useState } from "react";
import { Plus, Spinner, CheckCircle } from "@phosphor-icons/react";

interface AddProviderFormProps {
  onSuccess?: () => void;
}

export function AddProviderForm({ onSuccess }: AddProviderFormProps) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [operator, setOperator] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !label.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), label: label.trim(), operator: operator.trim() || "custom" }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add provider");
        return;
      }

      setSuccess(true);
      setUrl("");
      setLabel("");
      setOperator("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError("Network error — could not reach the API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col gap-4 border border-[#1e1e1e] bg-[#141414] p-6 rounded-[8px]">
      <div>
        <p className="eyebrow mb-1">PROBE REGISTRY</p>
        <h3
          className="text-[16px] font-medium text-white"
          style={{ fontFamily: "var(--font-inter)", letterSpacing: "-0.25px" }}
        >
          Add Custom RPC Provider
        </h3>
        <p className="mt-1 text-[13px] text-[#7c7c7c]" style={{ fontFamily: "var(--font-inter)" }}>
          Register a custom Ethereum RPC node to start monitoring and grading its responses.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Label Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="provider-label-input"
              className="text-[11px] font-medium text-[#7c7c7c] uppercase tracking-[0.5px]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              Label / Name
            </label>
            <input
              id="provider-label-input"
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Infura Mainnet"
              className="rounded-[8px] border border-[#313131] bg-[#0a0a0a] px-3.5 py-2 text-[14px] text-white placeholder-[#454545] outline-none focus:border-[#6798ff] transition-colors"
              style={{ fontFamily: "var(--font-inter)" }}
            />
          </div>

          {/* Operator Input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="provider-operator-input"
              className="text-[11px] font-medium text-[#7c7c7c] uppercase tracking-[0.5px]"
              style={{ fontFamily: "var(--font-jetbrains-mono)" }}
            >
              Operator (for weight splits)
            </label>
            <input
              id="provider-operator-input"
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="e.g. infura"
              className="rounded-[8px] border border-[#313131] bg-[#0a0a0a] px-3.5 py-2 text-[14px] text-white placeholder-[#454545] outline-none focus:border-[#6798ff] transition-colors"
              style={{ fontFamily: "var(--font-inter)" }}
            />
          </div>
        </div>

        {/* RPC URL Input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="provider-url-input"
            className="text-[11px] font-medium text-[#7c7c7c] uppercase tracking-[0.5px]"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            RPC URL
          </label>
          <input
            id="provider-url-input"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://eth-mainnet.g.alchemy.com/v2/your-key"
            className="w-full rounded-[8px] border border-[#313131] bg-[#0a0a0a] px-3.5 py-2 text-[14px] text-white placeholder-[#454545] outline-none focus:border-[#6798ff] transition-colors"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          />
        </div>

        {error && (
          <p className="text-[12px] text-[#ff6b6b]" style={{ fontFamily: "var(--font-inter)" }}>
            {error}
          </p>
        )}

        {success && (
          <div className="flex items-center gap-2 text-[12px] text-[#4dffb0]">
            <CheckCircle size={14} weight="fill" />
            <span style={{ fontFamily: "var(--font-inter)" }}>Provider registered successfully! First score in 40s.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url || !label}
          className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed text-[13px] mt-1"
          id="add-provider-submit-btn"
        >
          {loading ? <Spinner size={14} className="animate-spin" /> : <Plus size={14} weight="bold" />}
          Register Provider
        </button>
      </form>
    </div>
  );
}
