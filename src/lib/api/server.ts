/**
 * Server-side 1024 Public API caller. SERVER-ONLY (reads your API secret).
 *
 * Two entry points:
 *   apiGet(path)            — public reads (no auth). Used by Server Components.
 *   apiAuthed(path, {...})  — signed calls (trading, /me/*). Used by the proxy.
 *
 * `path` is the API path WITHOUT the /api/v1 prefix, e.g. "/prediction/collections".
 * Both return the UNWRAPPED `data` from the response envelope, or throw ApiError.
 */

import { signRequest } from "./sign";
import type { ApiResponse } from "./types";

export const API_BASE =
  process.env.API_1024_BASE?.replace(/\/$/, "") || "https://api-mainnet.1024ex.com";
const API_PREFIX = "/api/v1";

const API_KEY = process.env.API_1024_KEY || "";
const API_SECRET = process.env.API_1024_SECRET || "";

/** True when an API key + secret are configured — i.e. trading is unlocked. */
export function hasCredentials(): boolean {
  return Boolean(API_KEY && API_SECRET);
}

export class ApiError extends Error {
  code: string;
  codeNum: number;
  httpStatus: number;
  constructor(message: string, code = "UNKNOWN", codeNum = -1, httpStatus = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.codeNum = codeNum;
    this.httpStatus = httpStatus;
  }
}

interface CallOpts {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  /** request body object — serialized once, signed and sent byte-identical */
  body?: unknown;
  /** raw query string WITHOUT leading "?" (never signed) */
  query?: string;
  /** sign the request with HMAC (required for trading + /me/*) */
  auth?: boolean;
  /** ISR revalidate seconds for GET reads (ignored when auth) */
  revalidate?: number;
}

/**
 * Low-level call against a FULL path (including /api/v1). The HMAC signs the full
 * path, so the proxy — which already has the full path — calls this directly.
 */
export async function rawCall<T>(fullPath: string, opts: CallOpts = {}): Promise<T> {
  const { method = "GET", body, query, auth = false, revalidate = 15 } = opts;

  // Serialize the body EXACTLY ONCE: the same string is signed and sent.
  const bodyStr = body == null ? "" : JSON.stringify(body);

  const headers: Record<string, string> = {};
  if (bodyStr) headers["Content-Type"] = "application/json";

  if (auth) {
    if (!hasCredentials()) {
      throw new ApiError(
        "Trading requires API credentials. Set API_1024_KEY and API_1024_SECRET in .env.",
        "NO_CREDENTIALS",
      );
    }
    // Sign the path ONLY (no query string).
    Object.assign(headers, signRequest(API_KEY, API_SECRET, method, fullPath, bodyStr));
  }

  const url = `${API_BASE}${fullPath}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
    // Reads can be cached briefly; signed/write calls never are.
    ...(auth ? { cache: "no-store" as const } : { next: { revalidate } }),
  });

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(`Non-JSON response (HTTP ${res.status}) from ${fullPath}`, "BAD_RESPONSE", -1, res.status);
  }

  if (!json.success || json.error) {
    const e = json.error;
    throw new ApiError(e?.message || `Request failed (HTTP ${res.status})`, e?.code || "ERROR", e?.codeNum ?? -1, res.status);
  }
  return json.data as T;
}

/** Public read (no auth). `path` excludes the /api/v1 prefix. */
export function apiGet<T>(path: string, opts: { query?: string; revalidate?: number } = {}): Promise<T> {
  return rawCall<T>(`${API_PREFIX}${path}`, { method: "GET", ...opts });
}

/** Signed call (trading, /me/*). `path` excludes the /api/v1 prefix. */
export function apiAuthed<T>(
  path: string,
  opts: { method?: CallOpts["method"]; body?: unknown; query?: string } = {},
): Promise<T> {
  return rawCall<T>(`${API_PREFIX}${path}`, { auth: true, ...opts });
}
