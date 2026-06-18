"use client";

/**
 * The 1024 3D outcome button — ported verbatim from the real frontend's
 * WorldCup3DButton. Three stacked layers fake physical depth: a blurred shadow
 * lip, a gradient mid layer, and a raised solid face that lifts on hover and
 * presses on active. Green = YES, rose = NO.
 *
 * Renders as a <Link> when `href` is given (collection rows navigate to the
 * market), otherwise a <button> (the order ticket's outcome toggles).
 */
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "yes" | "no";

const COLORS: Record<Variant, { bg: string; shadow: string; mid: string }> = {
  yes: {
    bg: "bg-[#148d51]",
    shadow: "bg-[#0a4a2b]/50",
    mid: "bg-gradient-to-r from-[#0d6b3d] via-[#117a47] to-[#0d6b3d]",
  },
  no: {
    bg: "bg-rose-500",
    shadow: "bg-rose-800/50",
    mid: "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700",
  },
};

const SHELL =
  "group/btn relative block w-full border-none bg-transparent p-0 cursor-pointer transition-[filter] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40";

export function Outcome3DButton({
  label,
  priceCents,
  variant = "yes",
  grow,
  isSelected,
  href,
  onClick,
  disabled,
}: {
  label: string;
  priceCents: number;
  variant?: Variant;
  grow?: boolean;
  isSelected?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const c = COLORS[variant];
  const inner = (
    <>
      {/* SHADOW layer */}
      <span
        className={cn(
          "absolute inset-0 rounded-lg blur-[2px] translate-y-[2px] transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.4,1)] group-hover/btn:translate-y-[4px] group-active/btn:translate-y-[1px]",
          c.shadow,
        )}
      />
      {/* MID / lip layer */}
      <span className={cn("absolute inset-0 rounded-lg", c.mid)} />
      {/* RAISED FACE */}
      <span
        className={cn(
          "relative isolate block w-full -translate-y-[4px] rounded-lg px-3.5 py-2 text-center transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.4,1)] group-hover/btn:-translate-y-[6px] group-hover/btn:duration-200 group-active/btn:-translate-y-[2px] group-active/btn:duration-[34ms]",
          c.bg,
        )}
      >
        <span className="block whitespace-nowrap text-sm font-black tabular-nums text-white">
          {label} {priceCents}¢
        </span>
      </span>
    </>
  );

  return (
    <div className={cn(grow && "flex-1 min-w-0", isSelected && "rounded-lg ring-2 ring-[#50D2C1]/50 ring-offset-1 ring-offset-transparent")}>
      {href ? (
        <Link href={href} className={SHELL}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} disabled={disabled} className={cn(SHELL, "disabled:hover:brightness-100")}>
          {inner}
        </button>
      )}
    </div>
  );
}
