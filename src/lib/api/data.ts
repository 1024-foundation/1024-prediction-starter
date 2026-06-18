/**
 * Typed convenience fetchers — one function per endpoint the demo uses.
 * Read this file to see the entire 1024 surface the app depends on.
 * Everything here is a PUBLIC read (no credentials needed) except the /me/*
 * helpers, which sign via apiAuthed.
 */

import { apiGet, apiAuthed, rawCall } from "./server";
import { isActive, pricePct } from "../format";
import type { Collection, Market, Page, OrderBook, MarketPrices, PredictionUserStats, Position } from "./types";

// ── Discovery ───────────────────────────────────────────────────────────────

/** `GET /prediction/collections` → bare array. */
export function getCollections(pageSize = 60): Promise<Collection[]> {
  return apiGet<Collection[]>("/prediction/collections", { query: `page_size=${pageSize}`, revalidate: 30 });
}

/** `GET /prediction/collections/:id`. */
export function getCollection(id: string): Promise<Collection> {
  return apiGet<Collection>(`/prediction/collections/${id}`, { revalidate: 30 });
}

/** `GET /prediction/collections/:id/markets` → bare array. */
export function getCollectionMarkets(id: string, pageSize = 100): Promise<Market[]> {
  return apiGet<Market[]>(`/prediction/collections/${id}/markets`, { query: `page_size=${pageSize}`, revalidate: 15 });
}

/** One preview option row shown on a home collection card. */
export interface PreviewRow {
  marketId: string;
  label: string;
  yesCents: number;
  noCents: number;
  isMulti: boolean;
}

/**
 * Top markets of a collection with their Yes/No prices — for the home card's
 * option preview. Composes /collections/:id/markets + batch-prices.
 */
export async function getCollectionPreview(collectionId: string, topN = 3): Promise<PreviewRow[]> {
  const markets = await getCollectionMarkets(collectionId).catch(() => [] as Market[]);
  const ranked = [...markets]
    .sort(
      (a, b) =>
        Number(isActive(b.status)) - Number(isActive(a.status)) ||
        Number(b.totalVolumeE6 ?? 0) - Number(a.totalVolumeE6 ?? 0),
    )
    .slice(0, topN);
  const prices = await getBatchPrices(ranked.map((m) => m.marketId));
  return ranked.map((m) => {
    const o0 = (prices[m.marketId] as MarketPrices | undefined)?.outcomes?.[0];
    const yesCents = pricePct(o0?.yesPriceE6 ?? o0?.priceE6 ?? 500000);
    const noCents = o0?.noPriceE6 != null ? pricePct(o0.noPriceE6) : 100 - yesCents;
    return { marketId: m.marketId, label: m.question, yesCents, noCents, isMulti: (m.numOutcomes ?? 2) > 2 };
  });
}

/** `GET /prediction/markets/trending` → `{ items }`. */
export async function getTrending(pageSize = 8): Promise<Market[]> {
  const p = await apiGet<Page<Market>>("/prediction/markets/trending", { query: `page_size=${pageSize}`, revalidate: 20 });
  return p.items ?? [];
}

/** `GET /prediction/markets/:id`. */
export function getMarket(id: string): Promise<Market> {
  return apiGet<Market>(`/prediction/markets/${id}`, { revalidate: 10 });
}

/** `GET /prediction/markets/:id/orderbook?outcomeIndex=` (price book for one side). */
export function getOrderBook(id: string, outcomeIndex: 0 | 1): Promise<OrderBook> {
  return apiGet<OrderBook>(`/prediction/markets/${id}/orderbook`, { query: `outcomeIndex=${outcomeIndex}`, revalidate: 5 });
}

/**
 * `POST /prediction/markets/batch-prices` — last/mid price for many markets.
 * Public POST (no auth). Returns a map keyed by marketId. Chunks at the API's
 * 50-id cap.
 */
export async function getBatchPrices(marketIds: string[]): Promise<Record<string, MarketPrices>> {
  const map: Record<string, MarketPrices> = {};
  for (let i = 0; i < marketIds.length; i += 50) {
    const chunk = marketIds.slice(i, i + 50).map((x) => Number(x));
    const res = await rawCall<{ prices: MarketPrices[] }>("/api/v1/prediction/markets/batch-prices", {
      method: "POST",
      body: { marketIds: chunk },
      revalidate: 10,
    }).catch(() => null);
    for (const p of res?.prices ?? []) map[String(p.marketId)] = p;
  }
  return map;
}

// ── Authed (/me/*) — YOUR account, needs API credentials (HMAC) ───────────────
//
// Note: the public API only exposes account data for the CALLER (the key owner),
// via /prediction/me/*. The per-wallet public endpoints the 1024 console uses
// (GET /users/:wallet/profile, /prediction/users/:wallet/stats) live on the
// GATEWAY (/gateway/v1/...), NOT on this public API — they 404 here. So a
// third-party integrator can show its own account's data, but cannot fan out
// arbitrary wallets the way the first-party console does. (See FINDINGS.md.)

/** `GET /prediction/me/stats` (signed) — the caller's prediction stats. */
export function getMyStats(): Promise<PredictionUserStats> {
  return apiAuthed<PredictionUserStats>("/prediction/me/stats");
}

/** `GET /prediction/me/positions` (signed). */
export function getMyPositions(): Promise<Position[]> {
  return apiAuthed<Position[]>("/prediction/me/positions", { query: "activeOnly=true" });
}
