/**
 * Portfolio — YOUR account's prediction stats + open positions, read from the
 * authenticated /prediction/me/* endpoints (signed server-side via the proxy's
 * caller). Requires API credentials; in read-only mode we explain why.
 */
import { getMyStats, getMyPositions } from "@/lib/api/data";
import { hasCredentials, ApiError } from "@/lib/api/server";
import { Card, Stat, EmptyState, Badge } from "@/components/ui";
import { usd, num, cents } from "@/lib/format";
import type { Position, PredictionUserStats } from "@/lib/api/types";

export default async function PortfolioPage() {
  if (!hasCredentials()) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Portfolio</h1>
        <Card className="p-5 text-sm text-white/60">
          <p>
            Your portfolio reads <span className="font-mono text-white/80">/prediction/me/stats</span> and{" "}
            <span className="font-mono text-white/80">/prediction/me/positions</span> — authenticated endpoints scoped to
            the API key holder. Add <span className="font-mono">API_1024_KEY</span> +{" "}
            <span className="font-mono">API_1024_SECRET</span> to <span className="font-mono">.env</span> and reload.
          </p>
          <p className="mt-3 text-white/40">
            The public API only exposes account data for the key&apos;s own account — there is no public per-wallet
            lookup here (that lives on the first-party gateway). See FINDINGS.md.
          </p>
        </Card>
      </div>
    );
  }

  let stats: PredictionUserStats | null = null;
  let positions: Position[] = [];
  let error: string | null = null;
  try {
    [stats, positions] = await Promise.all([getMyStats(), getMyPositions()]);
  } catch (e) {
    error = e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to load your account.";
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-white">Portfolio</h1>

      {error ? (
        <EmptyState title="Couldn't load your account" hint={error} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total volume" value={usd(stats?.totalVolumeE6)} />
            <Stat label="Realized PnL" value={usd(stats?.totalPnlE6)} />
            <Stat label="Trades" value={num(stats?.totalTrades)} />
            <Stat label="Open positions" value={num(stats?.activePositions ?? positions.length)} />
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-white">Open positions</div>
            {positions.length === 0 ? (
              <EmptyState title="No open positions" hint="Place an order from any market to open one." />
            ) : (
              <Card className="divide-y divide-ink-line">
                {positions.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate text-white">{p.question ?? `Market ${p.marketId}`}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                        <Badge tone={p.outcomeIndex === 1 ? "red" : "green"}>{p.outcomeIndex === 1 ? "No" : "Yes"}</Badge>
                        {p.avgPriceE6 != null && <span>avg {cents(p.avgPriceE6 as number)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">{num(p.shares as number)} sh</div>
                      {p.unrealizedPnlE6 != null && (
                        <div className="text-xs text-white/45">uPnL {usd(p.unrealizedPnlE6 as number)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
