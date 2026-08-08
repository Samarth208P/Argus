"use client";

import { useEffect, useState } from "react";

/** Subtle "live · updated Ns ago" indicator driven by the real last-poll time. */
export function RPCStatus({ lastUpdated, refreshing }: { lastUpdated: number; refreshing?: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
  const ago = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-[#7c7c82]" style={{ fontFamily: "var(--font-jetbrains-mono)" }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full rounded-full bg-[#57d9a3] ${refreshing ? "animate-ping" : ""}`} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#57d9a3]" />
      </span>
      Live · updated {ago}
    </span>
  );
}
