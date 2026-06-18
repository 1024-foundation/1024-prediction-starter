/**
 * Minimal TypeScript types for the slice of the 1024 Public API this demo uses.
 * These mirror the real wire shapes (camelCase). We only declare the fields we
 * actually read — the API returns many more.
 *
 * Wire-type rule: every *Id is a STRING on the wire. priceE6 / *E6 are numbers
 * (e6-scaled integers). Keep ids as strings end-to-end.
 */

/** The envelope every endpoint wraps its payload in. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; codeNum: number; message: string; details?: Record<string, unknown> };
  meta?: { requestId: string; timestamp: number };
}

/** Item in `GET /prediction/collections` (the response `data` is a bare array). */
export interface Collection {
  collectionId: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  category?: string;
  status?: string;
  isFeatured?: boolean;
  marketCount?: number;
  eventName?: string;
}

/** A prediction market (subset). Binary markets have numOutcomes === 2. */
export interface Market {
  marketId: string;
  slug?: string;
  marketType?: string; // "BINARY" | "MULTI_OUTCOME" (sometimes lowercase)
  numOutcomes?: number;
  question: string;
  description?: string;
  category?: string;
  status?: string; // "ACTIVE" | "active" | "PENDING" | "RESOLVED" ...
  endTime?: string;
  totalVolumeE6?: number | string;
  totalLiquidityE6?: number | string;
  openInterestE6?: number | string;
  collectionId?: string;
  collectionName?: string;
  imageUrl?: string;
  finalOutcomeIndex?: number | null;
}

/** `{ items, pagination }` listing shape (markets, /me/* lists). */
export interface Page<T> {
  items: T[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface OrderBookLevel {
  // NOTE: the orderbook/depth endpoints return price as a FLOAT in [0,1]
  // (e.g. 0.021 = 2.1¢) — unlike batch-prices and order placement, which use e6.
  price: number; // probability in [0, 1]
  shares: number;
  orderCount?: number;
}

export interface OrderBook {
  marketId: string;
  marketType?: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  lastUpdated?: string;
}

/** One outcome's price from `POST /prediction/markets/batch-prices`. */
export interface OutcomePrice {
  outcomeIndex: number;
  label: string;
  priceE6: number;
  yesPriceE6?: number;
  noPriceE6?: number;
}
export interface MarketPrices {
  marketId: string;
  marketType?: string;
  outcomes: OutcomePrice[];
  updatedAt?: string;
}

/** Request body for `POST /prediction/orders`. */
export interface PlaceOrderRequest {
  marketId: string;
  side: 0 | 1; // 0 = buy, 1 = sell
  outcomeIndex: 0 | 1; // binary: 0 = Yes, 1 = No
  priceE6: number; // e6, in [1, 999999]
  amount: number; // shares (integer)
  orderType?: 0 | 1 | 2 | 3; // 0=GTC 1=GTD 2=IOC 3=FOK
  clientOrderId?: string; // idempotency
  // Cross-margin (leverage) — see README. marginMode "cross" = 全仓.
  leverage?: number;
  marginMode?: "cross" | "isolated";
}

/** Response from write endpoints (`TxResponse`). */
export interface TxResponse {
  txSignature: string; // internal op id, NOT on-chain
  orderId?: string;
  status?: string; // filled | partial_filled | active
  filledQty?: number;
}

/** A row from `GET /prediction/me/positions`. */
export interface Position {
  marketId: string;
  outcomeIndex?: number;
  question?: string;
  shares?: number | string;
  avgPriceE6?: number | string;
  realizedPnlE6?: number | string;
  unrealizedPnlE6?: number | string;
  [k: string]: unknown;
}

/** Public per-wallet profile (`GET /users/:wallet/profile`). */
export interface WalletProfile {
  totalVolumeE6?: number | string;
  totalPnlE6?: number | string;
  totalTrades?: number;
  winRatePercent?: number;
  vipTier?: string | number | null;
}

/** `GET /prediction/users/:wallet/stats`. */
export interface PredictionUserStats {
  totalTrades?: number;
  totalVolumeE6?: number | string;
  totalPnlE6?: number | string;
  activePositions?: number;
  activeOrders?: number;
  marketsParticipated?: number;
}
