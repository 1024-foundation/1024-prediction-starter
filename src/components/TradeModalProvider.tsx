"use client";

/**
 * App-wide QuickTrade modal — ported from the real QuickTradeModal. Any Yes/No
 * button anywhere (collection rows, home preview chips) opens it via
 * useTradeModal().open(...). The modal hosts the TradePanel for that market.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";
import { TradePanel, type TradeMarket } from "./TradePanel";

interface OpenPayload {
  market: TradeMarket;
  yesCents: number;
  noCents: number;
  outcome: 0 | 1;
}

interface TradeModalCtx {
  open: (p: OpenPayload) => void;
  close: () => void;
}

const Ctx = createContext<TradeModalCtx>({ open: () => {}, close: () => {} });

export function useTradeModal() {
  return useContext(Ctx);
}

export function TradeModalProvider({ tradingEnabled, children }: { tradingEnabled: boolean; children: ReactNode }) {
  const [payload, setPayload] = useState<OpenPayload | null>(null);
  const open = useCallback((p: OpenPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);

  return (
    <Ctx.Provider value={{ open, close }}>
      {children}
      {payload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-h-[calc(100vh-4rem)] w-full max-w-[400px] overflow-y-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-zinc-800/90 p-1.5 text-white/60 backdrop-blur transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <TradePanel
              market={payload.market}
              yesCents={payload.yesCents}
              noCents={payload.noCents}
              initialOutcome={payload.outcome}
              tradingEnabled={tradingEnabled}
              showHeader
              onSuccess={() => {}}
            />
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
