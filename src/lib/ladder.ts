/**
 * Indicative order-book ladder.
 *
 * Prediction markets on 1024 are quoted by an LP that provides liquidity around
 * the fair price. Liquid markets return real resting depth from the public API;
 * an illiquid market can come back with an empty book. When that happens we
 * generate an indicative ladder around the mid so the book still reads like the
 * real product. It is clearly labeled in the UI as indicative — never present
 * it as resting liquidity.
 *
 * Prices here match the orderbook/depth wire format: a float probability [0,1].
 */
import type { OrderBookLevel } from "./api/types";

/**
 * Build a symmetric ladder around `mid` (a probability in [0,1]). Sizes decay
 * with distance from the mid and vary per market (deterministic, seeded by the
 * market id) so different markets don't look identical.
 */
export function indicativeLadder(mid: number, seed: number, levels = 6): { bids: OrderBookLevel[]; asks: OrderBookLevel[] } {
  const m = Math.max(0.02, Math.min(0.98, mid)); // clamp 2¢..98¢
  const tick = 0.01; // 1¢
  const base = 1500 + (seed % 5) * 600; // 1500..4900 shares at the top of book
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  for (let i = 1; i <= levels; i++) {
    const decay = 1 - (i - 1) * 0.13;
    const wobble = 0.75 + 0.5 * ((Math.sin(seed * 0.7 + i * 1.9) + 1) / 2); // 0.75..1.25, deterministic
    const size = Math.max(80, Math.round(base * decay * wobble));
    const bidPrice = +(m - i * tick).toFixed(3);
    const askPrice = +(m + i * tick).toFixed(3);
    if (bidPrice > 0) bids.push({ price: bidPrice, shares: size });
    if (askPrice < 1) asks.push({ price: askPrice, shares: Math.round(size * 0.92) });
  }
  return { bids, asks };
}

/** A small deterministic seed from a market id string. */
export function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 997;
}
