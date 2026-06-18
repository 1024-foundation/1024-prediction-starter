# 1024 Prediction Starter

A **minimal, open-source prediction market** built entirely on the
[1024 Public API](https://api-mainnet.1024ex.com). It exists to teach one thing
well: *how a third-party platform integrates 1024 to run its own prediction
market* — browse event collections, read live order books, place leveraged
orders, and track positions.

It is deliberately small and heavily commented. Read the code top to bottom and
you understand the whole integration surface. Every screen renders **live data**
from the 1024 testnet out of the box (no credentials needed to browse).

> Next.js (App Router) + TypeScript + Tailwind. No database, no state library —
> just the 1024 Public API and a thin server-side signing proxy. The UI (the
> collection rows, the 3D Yes/No buttons, the order book) is ported from the real
> 1024 frontend so it looks like production, not a toy.

| Screen | What it teaches | Endpoints |
| --- | --- | --- |
| Home | Event collections (the entry point most users browse) | `GET /prediction/collections` |
| Collection | Binary Yes/No rows + multi-outcome, like the real `/prediction` UI | `…/collections/:id`, `…/collections/:id/markets`, `…/markets/batch-prices` |
| Market | Two-book order book + a leverage order ticket | `…/markets/:id`, `…/markets/:id/orderbook`, `POST …/orders` |
| Portfolio | Your account's stats + open positions | `GET …/me/stats`, `…/me/positions` |

## Quick start

```bash
cp .env.example .env        # defaults to mainnet (real, live markets)
npm install
npm run dev                 # http://localhost:3000
```

Out of the box it runs **read-only** — every collection, market and order book is
public, so you browse with no credentials. To place orders, add an API key +
secret to `.env` (see [Trading](#4-place-an-order-with-leverage)).

## How it's wired (the one architectural idea)

Custodial trading on 1024 is authenticated with an **API key + an HMAC
signature** over each request. That secret must never reach the browser. So:

```
browser ──> /api/1024/*  (Next.js Route Handler, server-only)
                 │  signs the request with your API secret (HMAC)
                 └──────────────────> 1024 Public API
```

- **Reads** (collections, markets, depth) need no auth — fetched directly in
  Server Components ([`src/lib/api/data.ts`](src/lib/api/data.ts)).
- **Writes** (place order) are signed server-side by the proxy
  ([`src/app/api/1024/[...path]/route.ts`](src/app/api/1024/[...path]/route.ts)).
- Your `API_1024_SECRET` lives only in `.env` (git-ignored) and on the server.

This is the pattern every Integration Partner should copy.

---

## The integration, end to end

### 1. Browse — collections → markets (public, no auth)

The base URL is `https://<host>/api/v1`. Every response is wrapped in an
envelope; read `.data`, and on failure switch on `.error.code`:

```jsonc
{ "success": true, "data": { /* ... */ }, "error": null, "meta": { "requestId": "…", "timestamp": 1750000000000 } }
```

A **collection** is an event (a match, an election). Inside are **markets** —
binary (Yes/No, `numOutcomes === 2`) or multi-outcome. Prices are e6 integers in
`[0, 1e6]` — a probability — so `650000` renders as `65¢`.

### 2. Onboard a user (server-to-server)

A brand-new user of *your* platform gets a 1024 account + API key in **one call**
— no 1024-hosted page required:

```
POST /api/v1/oauth/onboard
{ "walletAddress": "0x…", "walletType": "evm",
  "message": "1024 Exchange - login - 1750000000000",   // canonical login string
  "signature": "0x…",                                    // off-chain personal_sign
  "timestamp": 1750000000000,
  "permissions": { "canRead": true, "canTrade": true },
  "partnerTag": "yourslug" }                             // attributes the user to you
→ { apiKey, secretKey, accountId, apiKeyId, isNewUser }
```

Store `secretKey` server-side only (it is returned once). Email/social users with
no wallet use `POST /api/v1/oauth/onboard/privy`.

### 3. Sign authenticated requests (HMAC)

The exact recipe (from the gateway's `auth.rs`), implemented in
[`src/lib/api/sign.ts`](src/lib/api/sign.ts):

```
message   = `${timestamp}${METHOD}${path}${body}`
signature = hex( HMAC_SHA256(secretKey, message) )      // lowercase hex
headers   = X-API-KEY, X-TIMESTAMP (ms epoch), X-SIGNATURE
```

**Three gotchas that silently break the signature** (each cost real debugging):

1. **The query string is NOT signed** — sign the path only
   (`/api/v1/prediction/orders`), never the full URL.
2. **The body must be byte-identical** between what you sign and what you send.
   Serialize once, sign that string, send that string. Don't re-stringify.
3. **DELETE requests carry a body** (e.g. cancel order) and it *is* signed — make
   sure your HTTP client actually sends it.

Your clock must be within ±30s of the server.

### 4. Place an order (with leverage)

Leverage is 1024's signature feature, implemented via **Cross Margin (全仓)**: one
shared margin pool backs your positions, and an order's initial margin is
`notional ÷ leverage`. The order ticket
([`src/components/OrderTicket.tsx`](src/components/OrderTicket.tsx)) sends:

```
POST /api/v1/prediction/orders            (+ X-API-KEY / X-TIMESTAMP / X-SIGNATURE)
{ "marketId": "1808", "side": 0, "outcomeIndex": 0,   // side 0=buy 1=sell; outcome 0=Yes 1=No
  "priceE6": 650000, "amount": 100,                    // $0.65, 100 shares
  "orderType": 0, "clientOrderId": "cli_…",            // GTC; clientOrderId = idempotency
  "leverage": 2, "marginMode": "cross" }
→ { txSignature, orderId, status, filledQty }          // txSignature is an internal op id, NOT on-chain
```

To trade, add a key in `.env` and reload. Reads default to mainnet; for **safe
test orders** point the base at testnet-stable (free test USDC) — on mainnet,
orders are real:

```bash
API_1024_BASE=https://api-testnet-stable.1024ex.com   # testnet for practice
API_1024_KEY=1024_xxxxxxxx…
API_1024_SECRET=xxxxxxxx…
```

### 5. Portfolio

`GET /api/v1/prediction/me/stats` and `…/me/positions` (signed) return data for
the **API key's own account**.

---

## What you *cannot* do purely via the API (the honest seams)

Building this app surfaced exactly where the pure-API model stops. Be upfront with
your users about these:

- **Deposit is on-chain.** There is **no API that credits a balance.**
  `POST /accounts/deposits/prepare` returns *unsigned* bridge `stake()` calldata;
  the user must sign and broadcast it on the source chain (plus an ERC-20
  `approve` on EVM). This is the one mandatory "leave-the-pure-API" step.
- **Enabling withdrawals needs one wallet signature.** Onboard always issues
  `canWithdraw: false`. To ever withdraw, collect a fresh signature over
  `1024 Exchange - grant-withdraw - <apiKeyId> - <ts>` once per key, then
  allowlist a destination address (with a cooldown). After that, withdrawals
  themselves are pure API.
- **No public per-wallet analytics.** The 1024 first-party console builds its
  economics from `GET /users/:wallet/profile` etc., but those live on the
  **gateway**, not this public API — they 404 here. An external integrator can
  read its *own* account (`/me/*`), not arbitrary wallets.

See [`FINDINGS.md`](FINDINGS.md) for the full developer's-seat review of the 1024
Integration Partner program.

## Project layout

```
src/
  app/
    page.tsx                  home — collections browser
    collection/[id]/page.tsx  collection detail — Yes/No rows
    market/[id]/page.tsx      market — order book + ticket
    portfolio/page.tsx        your account
    api/1024/[...path]/       server-side signing proxy
  lib/
    api/sign.ts               the HMAC signer (server-only)
    api/server.ts             the API caller (envelope, auth, errors)
    api/data.ts               one function per endpoint used
    api/types.ts              wire types
    format.ts                 e6 / price / time helpers
    cn.ts                     clsx + tailwind-merge (same helper 1024 uses)
  components/
    CollectionCard.tsx        home grid card w/ live option preview (ported)
    CollectionMarketRow.tsx   the per-market Yes/No row
    Outcome3DButton.tsx       the green/red 3D outcome button (ported)
    TradeButton.tsx           a Yes/No button that opens the QuickTrade modal
    TradeModalProvider.tsx    app-wide QuickTrade modal + context (ported)
    TradePanel.tsx            the buy panel — amount, leverage, payout (ported)
    OrderBook.tsx             two-book Price|Size|Value depth book (ported)
    SiteHeader.tsx, ui.tsx    nav + small kit
  lib/ladder.ts               indicative depth around the mid (virtual-liquidity demo)
  lib/pool.ts                 bounded-concurrency fan-out
```

## License

MIT.
