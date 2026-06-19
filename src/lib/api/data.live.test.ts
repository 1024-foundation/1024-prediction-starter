import { describe, it, expect } from "vitest";
import type { ApiResponse, Collection, Market, OrderBook } from "./types";

/**
 * LIVE integration test against the real 1024 mainnet Public API.
 *
 * These endpoints are anonymous, CORS-open, and read-only — safe to hit.
 * The whole suite is skipped unless RUN_LIVE=1 so the default `npm test`
 * stays offline and green. Run with: `npm run test:live`.
 *
 * We use raw global fetch (not server.ts/data.ts) so the test never depends on
 * server-only modules, API credentials, or Next.js caching.
 */

const BASE = "https://api-mainnet.1024ex.com";

async function getJson<T>(path: string): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  expect(res.ok).toBe(true);
  return (await res.json()) as ApiResponse<T>;
}

describe.skipIf(!process.env.RUN_LIVE)("live: 1024 mainnet read endpoints", () => {
  it("GET /prediction/collections returns a success envelope with a non-empty data array", async () => {
    const json = await getJson<Collection[]>("/api/v1/prediction/collections");
    expect(json).toHaveProperty("success");
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect((json.data ?? []).length).toBeGreaterThan(0);
  });

  it("GET /prediction/collections/:id/markets returns an array", async () => {
    const collections = await getJson<Collection[]>("/api/v1/prediction/collections");
    const collectionId = (collections.data ?? [])[0]?.collectionId;
    expect(collectionId, "expected at least one collection id").toBeTruthy();

    const markets = await getJson<Market[] | { items: Market[] }>(
      `/api/v1/prediction/collections/${collectionId}/markets`,
    );
    expect(markets.success).toBe(true);
    // markets payload may be a bare array or an {items} page — accept either.
    const list = Array.isArray(markets.data)
      ? markets.data
      : (markets.data as { items?: Market[] } | undefined)?.items;
    expect(Array.isArray(list)).toBe(true);
  });

  it("GET /prediction/markets/:id/all-depths returns book levels with FLOAT prices in [0,1] (not e6)", async () => {
    // Walk collections until we find one with at least one market.
    const collections = await getJson<Collection[]>("/api/v1/prediction/collections");
    let marketId: string | undefined;
    for (const c of collections.data ?? []) {
      const markets = await getJson<Market[] | { items: Market[] }>(
        `/api/v1/prediction/collections/${c.collectionId}/markets`,
      );
      const list = Array.isArray(markets.data)
        ? markets.data
        : (markets.data as { items?: Market[] } | undefined)?.items ?? [];
      if (list.length > 0) {
        marketId = list[0].marketId;
        break;
      }
    }
    expect(marketId, "expected to find a market with an id").toBeTruthy();

    const depths = await getJson<OrderBook | OrderBook[] | Record<string, unknown>>(
      `/api/v1/prediction/markets/${marketId}/all-depths`,
    );
    expect(depths.success).toBe(true);
    expect(depths.data).toBeTruthy();

    // Collect every price field from any books present (binary or multi-outcome).
    const prices: number[] = [];
    const visit = (node: unknown) => {
      if (Array.isArray(node)) {
        for (const el of node) visit(el);
        return;
      }
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        if (typeof obj.price === "number") prices.push(obj.price);
        for (const v of Object.values(obj)) visit(v);
      }
    };
    visit(depths.data);

    // There should be at least one priced level somewhere in the response.
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) {
      expect(Number.isFinite(p)).toBe(true);
      // A FLOAT probability in [0,1] — NOT an e6 integer (which would be >> 1).
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
