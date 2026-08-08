import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
  eyebrowColor?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  eyebrowColor,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start",
        className
      )}
    >
      {eyebrow && (
        <Reveal as="p" className="eyebrow" >
          <span style={eyebrowColor ? { color: eyebrowColor } : undefined}>{eyebrow}</span>
        </Reveal>
      )}
      <Reveal
        as="h2"
        delay={1}
        className="max-w-[19ch] text-balance text-[clamp(30px,4.6vw,52px)] font-medium leading-[1.05] tracking-[-0.035em] text-white"
      >
        {title}
      </Reveal>
      {description && (
        <Reveal
          as="p"
          delay={2}
          className={cn(
            "max-w-[62ch] text-pretty text-[18px] leading-[1.6] text-[#a5a5ac]",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </Reveal>
      )}
    </div>
  );
}
