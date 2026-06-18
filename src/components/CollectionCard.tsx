/**
 * Home grid card for an event collection. Ported from the real
 * CollectionFeedCard: a thumbnail + title header, a preview of the collection's
 * top markets (label + probability bar + a green Yes price chip), and a footer
 * with the market count. The card body is a plain <div> so the header and each
 * option row can be their own links (no nested anchors).
 */
import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { num } from "@/lib/format";
import { TradeButton } from "./TradeButton";
import type { Collection } from "@/lib/api/types";
import type { PreviewRow } from "@/lib/api/data";

export function CollectionCard({ collection, preview }: { collection: Collection; preview: PreviewRow[] }) {
  const href = `/collection/${collection.collectionId}`;
  const shown = preview.slice(0, 3);
  const hidden = Math.max(0, (collection.marketCount ?? 0) - shown.length);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.06] shadow-card backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-elevated">
      <div className="flex flex-1 flex-col p-4">
        {/* Header: thumbnail + title */}
        <Link href={href} className="mb-3 flex items-start gap-2.5">
          <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
            {collection.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collection.coverImageUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="h-4 w-4 text-white/30" />
              </div>
            )}
          </div>
          <h3 className="min-w-0 flex-1 text-base font-bold leading-snug tracking-tight text-white transition-colors line-clamp-2 group-hover:text-accent">
            {collection.name}
          </h3>
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-white/40" />
        </Link>

        {/* Option preview rows */}
        <div className="divide-y divide-white/[0.06]">
          {shown.length === 0 ? (
            <div className="py-3 text-center text-xs text-white/35">No open markets</div>
          ) : (
            shown.map((row) => <OptionRow key={row.marketId} row={row} collectionName={collection.name} />)
          )}
          {hidden > 0 && (
            <Link href={href} className="block py-2.5 text-center text-[11px] text-white/45 transition-colors hover:text-white/70">
              +{num(hidden)} more · View all
            </Link>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-white/40">
          <span>{collection.category ?? "event"}</span>
          <span>{num(collection.marketCount)} markets</span>
        </div>
      </div>
    </div>
  );
}

function OptionRow({ row, collectionName }: { row: PreviewRow; collectionName: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={`/market/${row.marketId}`} className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-white/90">{row.label}</p>
        <div className="mt-1.5 h-1 w-28 max-w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, row.yesCents))}%`, backgroundColor: "#ff7d46" }} />
        </div>
      </Link>
      {row.isMulti ? (
        <Link
          href={`/market/${row.marketId}`}
          className="shrink-0 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent"
        >
          View →
        </Link>
      ) : (
        <TradeButton
          render="chip"
          outcome={0}
          yesCents={row.yesCents}
          noCents={row.noCents}
          market={{ marketId: row.marketId, question: row.label, collectionName }}
        />
      )}
    </div>
  );
}
