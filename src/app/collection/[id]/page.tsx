/**
 * Collection detail — the rows of markets inside an event, with each binary
 * market's Yes/No price. Faithful to the real 1024 collection page: a header
 * with cover thumbnail + title, then a "N Markets" heading with an accent
 * underline, then the list of CollectionMarketRow.
 *
 * Three public calls: the collection, its markets, and one batched price lookup.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { getCollection, getCollectionMarkets, getBatchPrices } from "@/lib/api/data";
import { ApiError } from "@/lib/api/server";
import { CollectionMarketRow } from "@/components/CollectionMarketRow";
import { EmptyState } from "@/components/ui";
import { num, isActive, pricePct } from "@/lib/format";
import type { Market, MarketPrices } from "@/lib/api/types";

export default async function CollectionPage({ params }: { params: { id: string } }) {
  let collection;
  let markets: Market[] = [];
  try {
    [collection, markets] = await Promise.all([getCollection(params.id), getCollectionMarkets(params.id)]);
  } catch (e) {
    if (e instanceof ApiError && e.httpStatus === 404) notFound();
    throw e;
  }

  // Active markets first, then by volume.
  const sorted = [...markets].sort(
    (a, b) => Number(isActive(b.status)) - Number(isActive(a.status)) || Number(b.totalVolumeE6 ?? 0) - Number(a.totalVolumeE6 ?? 0),
  );
  const prices = await getBatchPrices(sorted.map((m) => m.marketId));
  const totalOutcomes = markets.reduce((s, m) => s + (m.numOutcomes ?? 2), 0);

  const yn = (m: Market): [number, number] => {
    const o0 = (prices[m.marketId] as MarketPrices | undefined)?.outcomes?.[0];
    const yesCents = pricePct(o0?.yesPriceE6 ?? o0?.priceE6 ?? 500000);
    const noCents = o0?.noPriceE6 != null ? pricePct(o0.noPriceE6) : 100 - yesCents;
    return [yesCents, noCents];
  };

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" /> all collections
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-accent/30 bg-accent/15 md:h-16 md:w-16">
          {collection.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={collection.coverImageUrl} alt={collection.name} className="h-full w-full object-cover" />
          ) : (
            <Layers className="h-6 w-6 text-accent md:h-8 md:w-8" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-snug text-white md:text-2xl">{collection.name}</h1>
          {collection.description && <p className="mt-1 line-clamp-2 text-sm text-white/50">{collection.description}</p>}
          <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
            <span><span className="font-semibold tabular-nums text-white">{num(markets.length)}</span> markets</span>
            <span className="text-white/20">|</span>
            <span><span className="font-semibold tabular-nums text-white">{num(totalOutcomes)}</span> outcomes</span>
          </div>
        </div>
      </div>

      {/* Markets list */}
      {sorted.length === 0 ? (
        <EmptyState title="This collection has no markets" />
      ) : (
        <div className="space-y-4">
          <div className="border-b border-white/10">
            <h2 className="relative inline-block pb-3 text-base font-semibold text-white md:text-lg">
              {num(markets.length)} Markets
              <span aria-hidden className="absolute -bottom-px left-0 h-[3px] w-full rounded-full bg-accent" />
            </h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-surface-border">
            {sorted.map((m) => {
              const [yesCents, noCents] = yn(m);
              return <CollectionMarketRow key={m.marketId} market={m} yesCents={yesCents} noCents={noCents} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
