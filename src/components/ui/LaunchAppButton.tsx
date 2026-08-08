import Link from "next/link";
import { RocketLaunch } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/cn";

/** The loud "Launch App" CTA — animated flowing gradient, glow, shine sweep. */
export function LaunchAppButton({
  href = "/rpcs",
  className,
  label = "Launch App",
  onClick,
}: {
  href?: string;
  className?: string;
  label?: string;
  onClick?: () => void;
}) {
  return (
    <Link href={href} className={cn("launch-btn", className)} onClick={onClick}>
      <RocketLaunch size={15} weight="fill" className="launch-rocket" />
      {label}
    </Link>
  );
}
