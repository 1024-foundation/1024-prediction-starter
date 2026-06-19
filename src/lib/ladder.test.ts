import { describe, it, expect } from "vitest";
import { indicativeLadder, seedFromId } from "./ladder";
import type { OrderBookLevel } from "./api/types";

function assertStrictlyDescending(levels: OrderBookLevel[]) {
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i].price).toBeLessThan(levels[i - 1].price);
  }
}

function assertStrictlyAscending(levels: OrderBookLevel[]) {
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i].price).toBeGreaterThan(levels[i - 1].price);
  }
}

function assertValidLadder(book: { bids: OrderBookLevel[]; asks: OrderBookLevel[] }) {
  // Both sides must produce at least one level for a mid-range price.
  expect(book.bids.length).toBeGreaterThan(0);
  expect(book.asks.length).toBeGreaterThan(0);

  for (const lvl of [...book.bids, ...book.asks]) {
    // Every price strictly inside (0, 1) — never 0 or 1.
    expect(lvl.price).toBeGreaterThan(0);
    expect(lvl.price).toBeLessThan(1);
    // Every size at least 80 (the floor).
    expect(lvl.shares).toBeGreaterThanOrEqual(80);
  }

  assertStrictlyDescending(book.bids);
  assertStrictlyAscending(book.asks);
}

describe("indicativeLadder", () => {
  it("produces a valid ladder for a typical mid", () => {
    assertValidLadder(indicativeLadder(0.5, seedFromId("market-abc")));
  });

  it("keeps every price strictly inside (0,1) across many mids and seeds", () => {
    for (const mid of [0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97]) {
      for (const seed of [0, 1, 7, 42, 123, 500, 996]) {
        assertValidLadder(indicativeLadder(mid, seed));
      }
    }
  });

  it("clamps mid to [0.02, 0.98] — mid=0 still yields a valid ladder", () => {
    const book = indicativeLadder(0, seedFromId("zero"));
    assertValidLadder(book);
    // With mid clamped to 0.02, the top bid is 0.01 and asks climb from 0.03.
    expect(book.asks[0].price).toBeCloseTo(0.03, 6);
  });

  it("clamps mid to [0.02, 0.98] — mid=1.5 still yields a valid ladder", () => {
    const book = indicativeLadder(1.5, seedFromId("over"));
    assertValidLadder(book);
    // With mid clamped to 0.98, the top ask is 0.99 (< 1) and bids descend from 0.97.
    expect(book.bids[0].price).toBeCloseTo(0.97, 6);
  });

  it("is deterministic: same (mid, seed) -> identical output", () => {
    const a = indicativeLadder(0.42, 314);
    const b = indicativeLadder(0.42, 314);
    expect(a).toEqual(b);
  });

  it("different seed -> different sizes (same prices)", () => {
    const a = indicativeLadder(0.5, 1);
    const b = indicativeLadder(0.5, 2);
    // Prices are seed-independent (only depend on mid), so they match...
    expect(a.bids.map((l) => l.price)).toEqual(b.bids.map((l) => l.price));
    // ...but at least one size differs because of the seeded base + wobble.
    const aSizes = [...a.bids, ...a.asks].map((l) => l.shares);
    const bSizes = [...b.bids, ...b.asks].map((l) => l.shares);
    expect(aSizes).not.toEqual(bSizes);
  });

  it("honors the levels argument", () => {
    const book = indicativeLadder(0.5, 10, 4);
    expect(book.bids.length).toBe(4);
    expect(book.asks.length).toBe(4);
    assertValidLadder(book);
  });

  it("defaults to 6 levels", () => {
    const book = indicativeLadder(0.5, 10);
    expect(book.bids.length).toBe(6);
    expect(book.asks.length).toBe(6);
  });
});

describe("seedFromId", () => {
  it("is deterministic: same string -> same number", () => {
    expect(seedFromId("market-123")).toBe(seedFromId("market-123"));
  });

  it("returns a value in [0, 997)", () => {
    for (const id of ["", "a", "market-1", "🚀", "a very long market id string xyz", "0", "997"]) {
      const s = seedFromId(id);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(997);
      expect(Number.isInteger(s)).toBe(true);
    }
  });

  it("differs for different strings", () => {
    expect(seedFromId("alpha")).not.toBe(seedFromId("beta"));
    expect(seedFromId("market-1")).not.toBe(seedFromId("market-2"));
  });

  it("the empty string seeds 0", () => {
    expect(seedFromId("")).toBe(0);
  });
});
