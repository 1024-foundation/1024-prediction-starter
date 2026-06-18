/**
 * One collection row = one market (e.g. a country in the World Cup winner).
 * Ported from the real CollectionMarketRow: image + title on the left, a
 * probability % + orange bar, and the green/red 3D Yes/No buttons on the right.
 * Server component — the 3D buttons are Links into the market page.
 */
import Link from "next/link";
import { Check } from "lucide-react";
import { isActive } from "@/lib/format";
import { TradeButton } from "./TradeButton";
import type { Market } from "@/lib/api/types";

export function CollectionMarketRow({
  market,
  yesCents,
  noCents,
}: {
  market: Market;
  yesCents: number;
  noCents: number;
}) {
  const href = `/market/${market.marketId}`;
  const tradeMarket = {
    marketId: market.marketId,
    question: market.question,
    imageUrl: market.imageUrl,
    collectionName: market.collectionName,
  };
  const isMulti = (market.numOutcomes ?? 2) > 2 || (market.marketType ?? "").toUpperCase() === "MULTI_OUTCOME";
  const status = (market.status ?? "").toLowerCase();
  const resolved = status === "resolved";
  const cancelled = status === "cancelled";
  const prob = Math.max(0, Math.min(100, yesCents));

  return (
    <div className="border-b border-surface-border bg-white/[0.03] transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
          {/* Left: image + title */}
          <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
            {market.imageUrl && (
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-surface-border bg-white/[0.04] md:h-9 md:w-9">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={market.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <span className="block min-w-0 truncate text-sm font-medium leading-snug text-white md:text-base">
              {market.question}
            </span>
          </Link>

          {/* Right cluster */}
          {resolved ? (
            <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Check className="size-3.5 shrink-0" /> Resolved
            </div>
          ) : cancelled ? (
            <span className="shrink-0 rounded-lg border border-zinc-500/30 bg-zinc-500/15 px-3 py-1.5 text-xs font-semibold text-zinc-300">
              Cancelled
            </span>
          ) : (
            <div className="flex items-center gap-3">
              {/* Probability + bar (desktop) */}
              {!isMulti && (
                <div className="hidden w-28 shrink-0 flex-col gap-1 sm:flex">
                  <span className="text-base font-semibold leading-none tabular-nums text-white/75">{prob}%</span>
                  <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${prob}%`, backgroundColor: "#ff7d46" }} />
                  </div>
                </div>
              )}
              {/* Outcome buttons */}
              {isMulti ? (
                <Link
                  href={href}
                  className="shrink-0 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/15"
                >
                  View {market.numOutcomes} outcomes →
                </Link>
              ) : (
                <div className="flex gap-2">
                  <TradeButton market={tradeMarket} yesCents={yesCents} noCents={noCents} outcome={0} />
                  <TradeButton market={tradeMarket} yesCents={yesCents} noCents={noCents} outcome={1} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
