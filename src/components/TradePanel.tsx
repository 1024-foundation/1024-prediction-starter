"use client";

/**
 * The buy panel — a faithful, minimal port of the real SimpleTradePanel.
 * Pick Yes/No, type a dollar amount (your initial margin), choose leverage
 * (Cross Margin / 全仓), see the potential payout, and Buy. The order is sent
 * to our signing proxy, never directly from the browser.
 *
 * Used both inline on the market page and inside the QuickTrade modal.
 */
import { useMemo, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { toE6, usd } from "@/lib/format";
import type { TxResponse } from "@/lib/api/types";

const QUICK_AMOUNTS = [10, 25, 50, 100];
const LEVERAGES = [1, 2, 3, 5, 10];

export interface TradeMarket {
  marketId: string;
  question: string;
  imageUrl?: string;
  collectionName?: string;
}

export function TradePanel({
  market,
  yesCents,
  noCents,
  initialOutcome = 0,
  tradingEnabled,
  showHeader = false,
  onSuccess,
}: {
  market: TradeMarket;
  yesCents: number;
  noCents: number;
  initialOutcome?: 0 | 1;
  tradingEnabled: boolean;
  showHeader?: boolean;
  onSuccess?: () => void;
}) {
  const [outcome, setOutcome] = useState<0 | 1>(initialOutcome);
  const [amount, setAmount] = useState<number>(25);
  const [leverage, setLeverage] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TxResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cents = outcome === 0 ? yesCents : noCents;
  const sideLabel = outcome === 0 ? "Yes" : "No";

  // Payout math (teaching-clear): your `amount` is the initial margin you lock.
  // With leverage L, notional = amount × L; you buy notional/price shares, each
  // paying $1 if the outcome resolves true.
  const calc = useMemo(() => {
    const price = Math.max(0.01, Math.min(0.99, cents / 100)); // $/share
    const notional = amount * leverage;
    const shares = Math.floor(notional / price);
    const cost = shares * price;
    const payoutIfWin = shares; // $1 per winning share
    const profitIfWin = payoutIfWin - cost;
    const roi = amount > 0 ? (profitIfWin / amount) * 100 : 0;
    return { price, shares, cost, payoutIfWin, profitIfWin, roi };
  }, [cents, amount, leverage]);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        marketId: market.marketId,
        side: 0, // buy
        outcomeIndex: outcome,
        priceE6: toE6(calc.price),
        amount: calc.shares,
        orderType: 0, // GTC
        clientOrderId: `cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        leverage,
        marginMode: "cross" as const,
      };
      const res = await fetch("/api/1024/api/v1/prediction/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json?.error?.message || `Order failed (HTTP ${res.status})`);
      setResult(json.data as TxResponse);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border bg-ink-card">
      {showHeader && (
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          {market.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={market.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg">📊</div>
          )}
          <div className="min-w-0 flex-1">
            {market.collectionName && <div className="truncate text-xs font-medium text-white/60">{market.collectionName}</div>}
            <div className="line-clamp-2 text-sm font-medium text-white">{market.question}</div>
          </div>
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* Yes / No pills */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setOutcome(0)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-sm font-semibold transition-colors",
              outcome === 0
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400/80 hover:bg-emerald-500/10",
            )}
          >
            <span>Yes</span>
            <span className="font-bold tabular-nums">{yesCents}¢</span>
          </button>
          <button
            onClick={() => setOutcome(1)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-sm font-semibold transition-colors",
              outcome === 1
                ? "border-red-500/50 bg-red-500/15 text-red-300"
                : "border-red-500/20 bg-red-500/[0.06] text-red-400/80 hover:bg-red-500/10",
            )}
          >
            <span>No</span>
            <span className="font-bold tabular-nums">{noCents}¢</span>
          </button>
        </div>

        {/* Amount */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04]">
          <div className="flex h-14 items-center gap-3 px-4">
            <span className="flex items-center gap-1 text-sm font-medium text-white/50">
              Amount <span className="text-[9px] uppercase tracking-wider text-white/30">IM</span>
            </span>
            <span className="ml-auto flex items-baseline gap-0.5">
              <span className="text-lg text-white/40">$</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                className="w-24 bg-transparent text-right text-2xl font-semibold tabular-nums leading-none text-white outline-none"
              />
            </span>
          </div>
          <div className="flex gap-1 border-t border-white/[0.06] px-3 pb-2.5 pt-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-sm font-semibold tabular-nums transition-all active:scale-[0.98]",
                  amount === a ? "bg-emerald-500/10 text-emerald-400/85" : "text-white/50 hover:bg-white/[0.06] hover:text-white/85",
                )}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage — Cross Margin (全仓) */}
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
            Leverage · Cross margin (全仓)
          </div>
          <div className="flex gap-1.5">
            {LEVERAGES.map((l) => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-sm font-bold tabular-nums transition-colors",
                  leverage === l
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-white/[0.08] bg-white/[0.04] text-white/55 hover:text-white/85",
                )}
              >
                {l}×
              </button>
            ))}
          </div>
        </div>

        {/* You could win */}
        <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-emerald-500/5">
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/25">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/45">You could win</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold tabular-nums text-emerald-400">{usd(toE6(calc.payoutIfWin))}</span>
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-300">
                  +{calc.roi.toFixed(1)}%
                </span>
              </div>
            </div>
            {leverage > 1 && (
              <span className="shrink-0 rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">{leverage}×</span>
            )}
          </div>
          <div className="space-y-1 border-t border-emerald-500/15 px-3 py-2 text-xs">
            <Row k="Contracts" v={calc.shares.toLocaleString()} />
            <Row k="Avg price" v={`${cents}¢`} />
            <Row k={leverage > 1 ? "Notional" : "Cost"} v={usd(toE6(calc.cost))} />
            <Row k="Initial margin" v={usd(toE6(amount))} />
          </div>
        </div>

        {!tradingEnabled && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            Read-only mode — add <span className="font-mono">API_1024_KEY</span> + <span className="font-mono">API_1024_SECRET</span> to{" "}
            <span className="font-mono">.env</span> to place test orders.
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy || !tradingEnabled || calc.shares <= 0}
          className={cn(
            "w-full rounded-lg py-3 text-sm font-bold text-white shadow-[0_3px_0_#0b5531] transition-[filter] hover:brightness-110 disabled:opacity-40 disabled:shadow-none",
            outcome === 0 ? "bg-[#148d51]" : "bg-rose-500 shadow-[0_3px_0_#9f1239]",
          )}
        >
          {busy ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</span>
          ) : (
            `Buy ${sideLabel} · ${usd(toE6(amount))}`
          )}
        </button>

        {result && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Order {result.status ?? "submitted"} · id {result.orderId ?? result.txSignature}
            {result.filledQty != null && ` · filled ${result.filledQty}`}
          </div>
        )}
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{k}</span>
      <span className="font-medium text-white/80">{v}</span>
    </div>
  );
}
