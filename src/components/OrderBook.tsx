/**
 * The 1024 two-book order book — ported from SingleOrderBook + BinaryOrderBook.
 * Yes and No books side by side; within each: asks (red) reversed on top, a
 * spread indicator, then bids (green). Columns Price | Size | Value with a
 * left-anchored depth bar. Prices arrive as e6 integers (650000 = $0.65).
 */
import { cn } from "@/lib/cn";
import type { OrderBookLevel } from "@/lib/api/types";

const fmtAmount = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`;
const fmtValue = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}K` : v >= 1 ? `$${v.toFixed(0)}` : `$${v.toFixed(2)}`;
// price is a probability float in [0,1]: 0.021 -> "2.1¢"
const toCents = (p: number) => `${(p * 100).toFixed(1)}¢`;

function DepthRow({ level, side, maxSize }: { level: OrderBookLevel; side: "bid" | "ask"; maxSize: number }) {
  const isBid = side === "bid";
  const value = level.price * level.shares; // price is a [0,1] float; value in $
  const barWidth = Math.min(100, (level.shares / maxSize) * 100);
  return (
    <div className="relative flex h-[26px] items-center px-3 text-xs transition-colors hover:bg-white/5">
      <div
        className={cn("absolute left-1 bottom-0.5 top-0.5 rounded-[3px] transition-all", isBid ? "bg-emerald-500/15" : "bg-red-500/15")}
        style={{ width: `calc(${barWidth}% - 4px)` }}
      />
      <div className="relative z-10 grid w-full items-center" style={{ gridTemplateColumns: "60px 1fr 60px" }}>
        <span className={cn("font-mono font-medium", isBid ? "text-emerald-400" : "text-red-400")}>{toCents(level.price)}</span>
        <span className="text-center font-mono text-white/70">{fmtAmount(level.shares)}</span>
        <span className="text-center font-mono text-xs text-amber-300/70">{fmtValue(value)}</span>
      </div>
    </div>
  );
}

function SingleBook({ title, color, bids, asks }: { title: string; color: string; bids: OrderBookLevel[]; asks: OrderBookLevel[] }) {
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price);
  const sortedBids = [...bids].sort((a, b) => b.price - a.price);
  const bestAsk = sortedAsks[0]?.price;
  const bestBid = sortedBids[0]?.price;
  const mid = bestAsk != null && bestBid != null ? (bestAsk + bestBid) / 2 : bestAsk ?? bestBid;
  const spread = bestAsk != null && bestBid != null ? bestAsk - bestBid : null;
  const maxSize = Math.max(1, ...bids.map((l) => l.shares), ...asks.map((l) => l.shares));
  const empty = bids.length === 0 && asks.length === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border">
      <div className={cn("flex items-center justify-between border-b border-white/10 px-3 py-2 text-sm font-medium", color)}>
        <span>{title}</span>
        {mid != null && <span className="font-mono text-xs text-white/60">{toCents(mid)}</span>}
      </div>
      <div className="grid border-b border-white/5 px-3 py-1.5 text-xs font-medium text-white/40" style={{ gridTemplateColumns: "60px 1fr 60px" }}>
        <span>Price</span>
        <span className="text-center">Size</span>
        <span className="text-center">Value</span>
      </div>
      {empty ? (
        <div className="py-8 text-center text-xs text-white/30">No resting orders</div>
      ) : (
        <>
          <div className="space-y-0.5 border-b border-surface-border py-0.5">
            {/* asks reversed: best ask sits just above the spread */}
            {[...sortedAsks].reverse().slice(-6).map((l, i) => (
              <DepthRow key={`a${i}`} level={l} side="ask" maxSize={maxSize} />
            ))}
            {sortedAsks.length === 0 && <div className="py-2 text-center text-sm text-white/30">No asks</div>}
          </div>
          <div className="flex items-center justify-center gap-3 border-y border-white/10 bg-white/5 px-3 py-1.5 text-xs">
            <span className="text-white/40">Spread</span>
            <span className="font-mono font-medium text-white/70">{spread != null ? toCents(spread) : "--"}</span>
          </div>
          <div className="space-y-0.5 py-0.5">
            {sortedBids.slice(0, 6).map((l, i) => (
              <DepthRow key={`b${i}`} level={l} side="bid" maxSize={maxSize} />
            ))}
            {sortedBids.length === 0 && <div className="py-2 text-center text-sm text-white/30">No bids</div>}
          </div>
        </>
      )}
    </div>
  );
}

export function OrderBook({
  yes,
  no,
  indicative,
}: {
  yes: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  no: { bids: OrderBookLevel[]; asks: OrderBookLevel[] };
  /** true when the ladder is generated around the mid (no resting depth from the API). */
  indicative?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <SingleBook title="Yes" color="text-emerald-400" bids={yes.bids} asks={yes.asks} />
        <SingleBook title="No" color="text-red-400" bids={no.bids} asks={no.asks} />
      </div>
      <div className="flex items-center justify-center gap-6 text-xs text-white/40">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-emerald-500/30" /><span>Bids</span></div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded bg-red-500/30" /><span>Asks</span></div>
      </div>
      {indicative && (
        <p className="text-center text-[11px] leading-relaxed text-white/35">
          Indicative ladder around the mid — this market has no resting limit orders via the public API right now. On the
          real exchange the LP provides virtual liquidity here; an integrator would stream it from the{" "}
          <span className="font-mono">pm.orderbook</span> WebSocket.
        </p>
      )}
    </div>
  );
}
