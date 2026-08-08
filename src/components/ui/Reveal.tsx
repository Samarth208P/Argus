"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger step 1–4 maps to CSS reveal-2..4 delays. */
  delay?: 1 | 2 | 3 | 4;
  /** Trigger threshold margin. */
  rootMargin?: string;
  once?: boolean;
}

/**
 * Scroll-reveal wrapper. Adds `data-visible` when the element enters the
 * viewport; the actual transition lives in globals.css (.reveal), so this
 * ships almost no JS and fully respects prefers-reduced-motion.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delay,
  rootMargin = "0px 0px -12% 0px",
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) io.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin, threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);

  return (
    <Tag
      ref={ref as never}
      data-visible={visible}
      className={cn("reveal", delay && `reveal-${delay}`, className)}
    >
      {children}
    </Tag>
  );
}
