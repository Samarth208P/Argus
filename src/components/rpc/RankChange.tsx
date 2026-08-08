"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, ArrowDown, Minus } from "@phosphor-icons/react";

export type RankDelta = number | "new";

/**
 * Animated rank-change indicator. `delta` > 0 = moved up, < 0 = moved down,
 * 0 = unchanged, "new" = newly appeared. Emphasises briefly on change.
 */
export function RankChange({ delta }: { delta: RankDelta }) {
  const isNew = delta === "new";
  const n = typeof delta === "number" ? delta : 0;
  const dir = isNew ? "new" : n > 0 ? "up" : n < 0 ? "down" : "same";

  const color = dir === "up" ? "#57d9a3" : dir === "down" ? "#ff6b6b" : dir === "new" ? "#6798ff" : "#54545a";

  return (
    <span className="inline-flex min-w-[38px] items-center justify-end gap-0.5 text-[12px] font-medium tnum" style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={dir + n}
          initial={{ opacity: 0, y: dir === "up" ? 6 : dir === "down" ? -6 : 0, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-flex items-center gap-0.5"
        >
          {dir === "up" && <ArrowUp size={11} weight="bold" />}
          {dir === "down" && <ArrowDown size={11} weight="bold" />}
          {dir === "same" && <Minus size={11} />}
          {dir === "new" && "NEW"}
          {(dir === "up" || dir === "down") && Math.abs(n)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
