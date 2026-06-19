import { describe, it, expect } from "vitest";
import { mapPool } from "./pool";

const tick = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe("mapPool", () => {
  it("returns results in INPUT order regardless of completion order", async () => {
    const items = [1, 2, 3, 4, 5];
    const out = await mapPool(items, 3, async (n) => {
      // Larger numbers finish first — out-of-order completion.
      await tick((10 - n) * 5);
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it("passes the correct index to the mapper", async () => {
    const items = ["a", "b", "c", "d"];
    const out = await mapPool(items, 2, async (item, i) => `${i}:${item}`);
    expect(out).toEqual(["0:a", "1:b", "2:c", "3:d"]);
  });

  it("processes ALL items exactly once", async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const calls = new Map<number, number>();
    const out = await mapPool(items, 7, async (n) => {
      calls.set(n, (calls.get(n) ?? 0) + 1);
      await tick(1);
      return n;
    });
    expect(out).toEqual(items);
    expect(calls.size).toBe(items.length);
    for (const n of items) expect(calls.get(n)).toBe(1);
  });

  it("NEVER exceeds the concurrency limit", async () => {
    const limit = 4;
    const items = Array.from({ length: 30 }, (_, i) => i);
    let active = 0;
    let maxActive = 0;
    await mapPool(items, limit, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      expect(active).toBeLessThanOrEqual(limit); // assert at the peak, every call
      // Stagger so workers genuinely overlap and contend for the pool.
      await tick(5 + (n % 3) * 3);
      active--;
      return n;
    });
    expect(maxActive).toBeLessThanOrEqual(limit);
    // With 30 items and a limit of 4, the pool should actually saturate.
    expect(maxActive).toBe(limit);
  });

  it("runs at most items.length workers when limit > items.length", async () => {
    const items = [1, 2, 3];
    let active = 0;
    let maxActive = 0;
    const out = await mapPool(items, 10, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await tick(5);
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6]);
    // Only 3 items exist, so concurrency can never exceed 3 even though limit=10.
    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("handles an empty array without spawning workers", async () => {
    let called = false;
    const out = await mapPool<number, number>([], 5, async (n) => {
      called = true;
      return n;
    });
    expect(out).toEqual([]);
    expect(called).toBe(false);
  });

  it("works with limit of 1 (fully serial) and preserves order", async () => {
    const items = [1, 2, 3, 4];
    let active = 0;
    let maxActive = 0;
    const out = await mapPool(items, 1, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await tick(2);
      active--;
      return n;
    });
    expect(out).toEqual([1, 2, 3, 4]);
    expect(maxActive).toBe(1);
  });

  it("propagates an error from the mapper", async () => {
    await expect(
      mapPool([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
