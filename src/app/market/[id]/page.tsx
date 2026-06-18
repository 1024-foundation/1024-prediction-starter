/**
 * Market detail — the order book (both sides) plus the order ticket.
 * Reads are public; the ticket writes through the signing proxy.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, BarChart3 } from "lucide-react";
import { getMarket, getAllDepths, getBatchPrices } from "@/lib/api/data";
import { hasCredentials, ApiError } from "@/lib/api/server";
import { OrderBook } from "@/components/OrderBook";
import { TradePanel } from "@/components/TradePanel";
import { Badge } from "@/components/ui";
import { usd, until, isActive, pricePct } from "@/lib/format";
import { indicativeLadder, seedFromId } from "@/lib/ladder";
import type { OrderBook as OB } from "@/lib/api/types";

const emptyBook: Pick<OB, "bids" | "asks"> = { bids: [], asks: [] };

export default async function MarketPage({ params }: { params: { id: string } }) {
  let market;
  try {
    market = await getMarket(params.id);
  } catch (e) {
    if (e instanceof ApiError && e.httpStatus === 404) notFound();
    throw e;
  }

  // Use /all-depths: it overlays the LP's virtual ladder (what the first-party
  // UI shows), unlike /orderbook & /depth which return sparse RESTING orders.
  const [depths, prices] = await Promise.all([getAllDepths(params.id), getBatchPrices([params.id])]);
  const yesBook = depths[0] ?? emptyBook;
  const noBook = depths[1] ?? emptyBook;

  const o0 = prices[params.id]?.outcomes?.[0];
  const yesE6 = o0?.yesPriceE6 ?? o0?.priceE6 ?? 500000;
  const noE6 = o0?.noPriceE6 ?? 1_000_000 - Number(yesE6);
  const defaultYesCents = pricePct(yesE6);
  const noCents = pricePct(noE6);

  // /all-depths already overlays the LP virtual ladder. If a market still comes
  // back empty (no LP quoting it), fall back to an indicative ladder around the
  // mid so the book reads sensibly. (Both clearly distinguished in the UI.)
  const seed = seedFromId(params.id);
  const yesEmpty = yesBook.bids.length === 0 && yesBook.asks.length === 0;
  const noEmpty = noBook.bids.length === 0 && noBook.asks.length === 0;
  const indicative = yesEmpty || noEmpty;
  // indicativeLadder takes a probability float [0,1]; batch-prices is e6, so /1e6.
  const yesShown = yesEmpty ? indicativeLadder(Number(yesE6) / 1e6, seed) : yesBook;
  const noShown = noEmpty ? indicativeLadder(Number(noE6) / 1e6, seed + 1) : noBook;

  return (
    <div className="space-y-5">
      {market.collectionId && (
        <Link href={`/collection/${market.collectionId}`} className="inline-flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {market.collectionName ?? "collection"}
        </Link>
      )}

      {/* Event header */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {market.imageUrl && (
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/[0.06] sm:h-12 sm:w-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={market.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="mb-1 line-clamp-2 text-base font-bold leading-snug text-white sm:text-lg">{market.question}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
                <Badge tone={isActive(market.status) ? "green" : "amber"}>{(market.status ?? "").toLowerCase()}</Badge>
                <span className="flex items-center gap-1"><BarChart3 className="h-3 w-3" /> {usd(market.totalVolumeE6)} vol</span>
                {market.endTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {until(market.endTime)}</span>}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-black tabular-nums text-white">{defaultYesCents}¢</div>
            <div className="text-[11px] text-white/40">Yes</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-white">Order book</div>
          <OrderBook yes={yesShown} no={noShown} indicative={indicative} />
        </div>
        <TradePanel
          market={{ marketId: market.marketId, question: market.question, imageUrl: market.imageUrl, collectionName: market.collectionName }}
          yesCents={defaultYesCents}
          noCents={noCents}
          tradingEnabled={hasCredentials()}
        />
      </div>
    </div>
  );
}
