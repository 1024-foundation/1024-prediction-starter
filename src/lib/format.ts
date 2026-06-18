/**
 * Money & price formatting for the 1024 Public API.
 *
 * The API speaks "e6" — integers scaled by 1e6. A USDC amount of $2,504.06 is
 * sent as 2504056000; a probability price of $0.65 is 650000. Prediction-market
 * prices live in [0, 1] (a probability), so we usually show them as cents.
 *
 * All *Id fields are strings on the wire (see CONTRACT in the README) — never do
 * math on them, never parse them as numbers (JS loses precision past 2^53).
 */

/** e6 integer (number or numeric string) → plain float. */
export function fromE6(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n / 1_000_000 : 0;
}

/** float dollars → e6 integer (for request bodies). */
export function toE6(dollars: number): number {
  return Math.round(dollars * 1_000_000);
}

/** $2,504.06 */
export function usd(e6: number | string | null | undefined, dp = 2): string {
  return fromE6(e6).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

/** Compact money for dense tables: $2.5K, $1.2M. */
export function usdCompact(e6: number | string | null | undefined): string {
  const n = fromE6(e6);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

/** A probability price (e6 in [0,1e6]) → "65¢". */
export function cents(priceE6: number | string | null | undefined): string {
  const c = Math.round(fromE6(priceE6) * 100);
  return `${c}¢`;
}

/**
 * A probability price (e6) → percent number, e.g. 65. Clamped to [0, 100]:
 * a probability can't exceed 100%, but one-sided books can yield a synthetic
 * mid slightly above 1.0, which would otherwise render as "103¢".
 */
export function pricePct(priceE6: number | string | null | undefined): number {
  return Math.max(0, Math.min(100, Math.round(fromE6(priceE6) * 100)));
}

/** Plain integer with thousands separators. */
export function num(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return (Number.isFinite(n) ? (n as number) : 0).toLocaleString("en-US");
}

/** "in 3d" / "in 5h" / "ended" from an ISO timestamp. */
export function until(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "ended";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `in ${hrs}h`;
  return `in ${Math.round(hrs / 24)}d`;
}

/** Case-insensitive status check — the API emits both "ACTIVE" and "active". */
export function isActive(status: string | null | undefined): boolean {
  return (status ?? "").toLowerCase() === "active";
}
