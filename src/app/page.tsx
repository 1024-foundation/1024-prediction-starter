/**
 * Home — the event-collections browser. A Server Component that fetches live,
 * public data from the 1024 Public API (no credentials needed).
 *
 * Most users browse COLLECTIONS (events) first; each collection is composed of
 * binary + multi-outcome markets. So we lead with collections AND preview a few
 * of the markets inside each one — exactly like the real 1024 /prediction feed.
 */
import { getCollections, getCollectionPreview, type PreviewRow } from "@/lib/api/data";
import { API_BASE, ApiError } from "@/lib/api/server";
import { mapPool } from "@/lib/pool";
import { CollectionCard } from "@/components/CollectionCard";
import { EmptyState } from "@/components/ui";
import type { Collection } from "@/lib/api/types";

// How many collections to render with live option previews on the home page.
const HOME_LIMIT = 12;

export default async function HomePage() {
  let collections: Collection[] = [];
  let error: string | null = null;
  try {
    collections = await getCollections(60);
  } catch (e) {
    error = e instanceof ApiError ? `${e.code}: ${e.message}` : "Failed to load collections.";
  }

  // Lead with featured + liquid collections.
  const ranked = collections
    .filter((c) => (c.marketCount ?? 0) > 0)
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || (b.marketCount ?? 0) - (a.marketCount ?? 0))
    .slice(0, HOME_LIMIT);

  // Fan out the top-markets preview for each card (bounded concurrency).
  const previews: PreviewRow[][] = ranked.length
    ? await mapPool(ranked, 6, (c) => getCollectionPreview(c.collectionId, 3).catch(() => []))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Event collections</h1>
        <p className="mt-1 text-sm text-white/50">
          Live from <span className="font-mono text-white/70">{API_BASE.replace("https://", "")}</span>. A collection is
          an event (a match, an election); inside are the binary and multi-outcome markets you trade.
        </p>
      </div>

      {error ? (
        <EmptyState title="Couldn't reach the 1024 API" hint={error} />
      ) : ranked.length === 0 ? (
        <EmptyState title="No collections with markets right now" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map((c, i) => (
            <CollectionCard key={c.collectionId} collection={c} preview={previews[i] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
