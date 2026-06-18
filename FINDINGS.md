# Building on 1024: a developer's field notes

This file is the honest write-up of what it was like to build this starter on the
1024 Public API — what's smooth, where the seams are, and the gotchas that cost
real debugging time. If you're integrating 1024, read this before you start.

**Bottom line:** you *can* run a complete custodial prediction market for your own
users almost entirely server-to-server. We browsed live markets, read order
books, and wired a leveraged order ticket without ever asking a user to sign a
blockchain transaction. There is exactly **one** unavoidable on-chain step
(funding) and **one** one-time signature (enabling withdrawals). Everything else
is a normal REST + HMAC integration.

---

## What's genuinely good

- **Headless onboarding.** `POST /api/v1/oauth/onboard` turns a brand-new wallet
  into a 1024 account **and** returns an API key + secret in the same response —
  no 1024-hosted page, no pre-existing 1024 identity required. The user signs one
  *off-chain* message (`1024 Exchange - login - <ts>`); your backend does the rest.
  Email/social users go through `…/onboard/privy`.
- **Custodial trading needs no per-trade blockchain signature.** Once you hold the
  API key, placing/cancelling orders is pure REST + HMAC. 1024 custodies and
  settles. `txSignature` in a write response is an internal op id, *not* an
  on-chain signature.
- **The data model is clean.** Collections (events) → markets (binary Yes/No or
  multi-outcome). Prices are e6 probabilities. Order books, depth, k-lines,
  batch-prices — all public, all consistent camelCase under one envelope.
- **Idempotency is real.** Send `clientOrderId` in the body (or the
  `X-Idempotency-Key` header — it folds into the same key) and retries are safe.

## The two structural seams (plan for these)

1. **Funding is on-chain. There is no API that credits a balance.**
   `POST /accounts/deposits/prepare` returns *unsigned* bridge `stake()` calldata
   (on EVM you must also send an ERC-20 `approve` first). The user — or a wallet
   your backend controls — has to sign and broadcast it on the source chain, then
   you poll `…/deposits/status`. If your product promise is "users never touch a
   chain," this is the one place that breaks, and you need a funding strategy
   (hosted deposit, on-ramp, or a backend-held source wallet).

2. **Enabling withdrawals needs one wallet signature, once.**
   Every onboard-issued key is `canWithdraw: false`. To ever withdraw you must
   collect a fresh signature over `1024 Exchange - grant-withdraw - <apiKeyId> - <ts>`
   (a 5-minute window) and `POST …/me/api-keys/{id}/grant-withdraw`, then allowlist
   a destination address (with a cooldown). **After that, withdrawals themselves
   are pure API** — no per-withdrawal signature.

## Scope note: your data vs. everyone's data

The public API exposes account data only for **the key's own account**
(`/prediction/me/*`). There is **no public per-wallet lookup** —
`GET /users/:wallet/profile` and `…/users/:wallet/stats` are **404 on the public
API** (they live on 1024's first-party gateway). So you can build a rich
"my portfolio" view, but you cannot fan out arbitrary wallets to build a
cross-user analytics dashboard the way the 1024 first-party console does.

## Gotchas that will bite you (this repo handles all of them)

| # | Gotcha | What to do |
|---|--------|-----------|
| 1 | **The HMAC signs the path only — not the query string.** | Sign `/api/v1/prediction/orders`, never the full URL. ([`sign.ts`](src/lib/api/sign.ts)) |
| 2 | **The body must be byte-identical between signing and sending.** | Serialize once; sign that string; send that string. Don't re-stringify. ([`server.ts`](src/lib/api/server.ts)) |
| 3 | **`DELETE` requests carry a signed body** (e.g. cancel order). | Make sure your HTTP client actually sends the body on DELETE. |
| 4 | **The HMAC timestamp window is ±30 seconds**, not 5 minutes. | Sign immediately before sending; keep clocks NTP-synced. (The *grant-withdraw* step-up is a separate ±300s window — don't confuse them.) |
| 5 | **All `*Id` fields are strings on the wire** (string-or-number on input). | Keep ids as strings end-to-end; never `Number()` a marketId. ([`types.ts`](src/lib/api/types.ts)) |
| 6 | **`status` casing is inconsistent** — `"ACTIVE"` on the market detail, `"active"` in collection listings. | Compare case-insensitively. ([`format.ts`](src/lib/api/format.ts) `isActive`) |
| 7 | **Price units differ across endpoints.** `orderbook`/`depth` return `price` as a FLOAT in `[0,1]` (`0.021` = 2.1¢); `batch-prices` and order placement use **e6** (`650000` = 65¢). | Convert per endpoint — don't assume one unit. ([`OrderBook.tsx`](src/components/OrderBook.tsx) vs [`format.ts`](src/lib/api/format.ts)) |
| 8 | **Liquid markets return real depth; illiquid ones can be empty.** An empty book is not an error. | Render real depth when present; show an empty state or an indicative ladder otherwise. ([`ladder.ts`](src/lib/ladder.ts)) |
| 9 | **One-sided books can yield a synthetic mid > 1.0** (e.g. a `103¢` price). | Clamp displayed probabilities to `[0,100]¢`. ([`format.ts`](src/lib/format.ts) `pricePct`) |
| 10 | **`/collections/:id/markets` ignores `page_size`** — it returns the full member array (hundreds). | Fetch once, slice client-side; don't expect server-side top-N. |
| 11 | **`leverage` is rejected on mint endpoints** but fine on `/orders`. | Keep mint payloads to `{marketId, amount, clientOrderId?}`. |
| 12 | **`positionSide` is SCREAMING_SNAKE on the wire** (`LONG`/`SHORT`). | Send upper-case; lower-case deserializes to "unset". |

## Leverage = Cross Margin (全仓)

1024's signature feature. One shared margin pool backs your positions; an order's
initial margin is `notional ÷ leverage`. Send `leverage` + `marginMode: "cross"`
on the order. You do **not** need to send `marginSchemaVersion` to get leverage —
the server upgrades the order to cross-margin automatically. The server enforces a
per-duration leverage cap and rejects leverage on mint.

---

*These notes were produced by actually building this app against the live testnet,
then verifying each claim against the public-api source. Where the official
Integration Guide and the running server disagreed, the server won — and those
discrepancies were reported upstream.*
