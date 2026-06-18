"use client";

/**
 * A Yes/No button that opens the QuickTrade modal (instead of navigating).
 * Used on collection rows ("3d" — the raised outcome button) and on the home
 * preview cards ("chip" — a compact green pill). All trade context is passed in
 * as serializable props so server components can render it.
 */
import { useTradeModal } from "./TradeModalProvider";
import { Outcome3DButton } from "./Outcome3DButton";
import type { TradeMarket } from "./TradePanel";

export function TradeButton({
  market,
  yesCents,
  noCents,
  outcome,
  render = "3d",
}: {
  market: TradeMarket;
  yesCents: number;
  noCents: number;
  outcome: 0 | 1;
  render?: "3d" | "chip";
}) {
  const { open } = useTradeModal();
  const cents = outcome === 0 ? yesCents : noCents;
  const label = outcome === 0 ? "Yes" : "No";
  const onClick = () => open({ market, yesCents, noCents, outcome });

  if (render === "chip") {
    const isYes = outcome === 0;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-black tabular-nums text-white transition-[filter] hover:brightness-110 ${
          isYes ? "bg-[#148d51] shadow-[0_3px_0_#0b5531]" : "bg-rose-500 shadow-[0_3px_0_#9f1239]"
        }`}
      >
        {label} {cents}¢
      </button>
    );
  }

  return <Outcome3DButton label={label} priceCents={Math.round(cents)} variant={isYesVariant(outcome)} onClick={onClick} />;
}

function isYesVariant(outcome: 0 | 1): "yes" | "no" {
  return outcome === 0 ? "yes" : "no";
}
