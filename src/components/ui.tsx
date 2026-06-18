/**
 * Tiny presentational kit — just enough to make the demo read as a real
 * prediction market. No client state; safe to use from Server Components.
 */
import Link from "next/link";
import { pricePct, cents } from "@/lib/format";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-ink-line bg-ink-card ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "red" | "brand" | "amber" }) {
  const tones: Record<string, string> = {
    neutral: "border-white/15 text-white/60",
    green: "border-yes/40 text-yes",
    red: "border-no/40 text-no",
    brand: "border-brand/40 text-brand",
    amber: "border-amber-400/40 text-amber-300",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** The orange probability bar from the real /prediction UI. */
export function ProbBar({ priceE6 }: { priceE6: number | string | null | undefined }) {
  const pct = Math.max(0, Math.min(100, pricePct(priceE6)));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#ff7d46" }} />
    </div>
  );
}

/**
 * The two-button Yes/No price chips used on every binary row, matching the real
 * collection UI: a green YES and a red NO showing each side's price in cents.
 */
export function YesNoChips({
  yesE6,
  noE6,
  href,
}: {
  yesE6: number | string | null | undefined;
  noE6: number | string | null | undefined;
  href: string;
}) {
  return (
    <div className="flex shrink-0 gap-2">
      <Link
        href={href}
        className="flex min-w-[68px] flex-col items-center rounded-lg border border-yes/30 bg-yes/10 px-3 py-1.5 transition hover:bg-yes/20"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-yes/80">Yes</span>
        <span className="text-sm font-semibold text-yes">{cents(yesE6)}</span>
      </Link>
      <Link
        href={href}
        className="flex min-w-[68px] flex-col items-center rounded-lg border border-no/30 bg-no/10 px-3 py-1.5 transition hover:bg-no/20"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-no/80">No</span>
        <span className="text-sm font-semibold text-no">{cents(noE6)}</span>
      </Link>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-line bg-ink-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {sub != null && <div className="mt-0.5 text-xs text-white/45">{sub}</div>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-line py-12 text-center">
      <div className="text-sm text-white/60">{title}</div>
      {hint && <div className="text-xs text-white/35">{hint}</div>}
    </div>
  );
}
