/**
 * HMAC request signing for authenticated 1024 Public API calls.
 *
 * ⚠️ SERVER-ONLY. This uses your API secret. It must never run in the browser.
 * It is imported only by the server-side caller (server.ts) and the proxy route.
 *
 * The exact recipe (from the gateway's auth.rs):
 *
 *     message   = `${timestamp}${METHOD}${path}${body}`
 *                  │           │        │      └ raw request body string ("" if none)
 *                  │           │        └ URL path ONLY — no query string
 *                  │           └ HTTP method, UPPERCASE
 *                  └ ms epoch, the exact value sent in X-TIMESTAMP
 *     signature = hex( HMAC_SHA256(secretKey, message) )   // lowercase hex
 *
 * Sent as headers:  X-API-KEY, X-TIMESTAMP, X-SIGNATURE
 * The server allows ±30s of clock skew, so your clock must be roughly correct.
 *
 * THREE gotchas that silently break the signature (all learned from the contract):
 *   1. Query string is NOT signed. Sign the path only ("/api/v1/prediction/orders").
 *   2. The body must be BYTE-IDENTICAL between what you sign and what you send.
 *      Serialize once, sign that string, send that string. Never re-stringify.
 *   3. DELETE requests DO carry a body (e.g. cancel order) and it IS signed —
 *      make sure your HTTP client actually sends it.
 */

import { createHmac } from "node:crypto";

export interface SignedHeaders {
  "X-API-KEY": string;
  "X-TIMESTAMP": string;
  "X-SIGNATURE": string;
}

/**
 * @param method  HTTP method (any case; we upper-case it)
 * @param path    URL path WITHOUT query string, e.g. "/api/v1/prediction/orders"
 * @param body    the exact body string you will send ("" for GET / no body)
 */
export function signRequest(
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  body: string,
): SignedHeaders {
  const timestamp = Date.now().toString(); // ms epoch
  const message = `${timestamp}${method.toUpperCase()}${path}${body}`;
  const signature = createHmac("sha256", apiSecret).update(message).digest("hex");
  return {
    "X-API-KEY": apiKey,
    "X-TIMESTAMP": timestamp,
    "X-SIGNATURE": signature,
  };
}
