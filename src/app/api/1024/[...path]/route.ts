/**
 * Server-side signing proxy: the browser's ONLY door to the 1024 Public API.
 *
 *   browser  ──fetch──>  /api/1024/<api/v1/...>  ──(HMAC-signed here)──>  1024 API
 *
 * The browser never sees your API secret. A client component calls, e.g.,
 *   fetch("/api/1024/api/v1/prediction/orders", { method: "POST", body })
 * and this handler signs it (if credentials are configured) and forwards it.
 *
 * Reads work with no credentials (public endpoints); when API_1024_KEY/SECRET
 * are set, every forwarded call is signed so protected endpoints work too.
 */

import { NextRequest } from "next/server";
import { rawCall, hasCredentials, ApiError } from "@/lib/api/server";

export const dynamic = "force-dynamic"; // never cache signed/proxied calls

async function handle(req: NextRequest, path: string[], method: "GET" | "POST" | "DELETE") {
  const fullPath = "/" + path.join("/"); // e.g. /api/v1/prediction/orders
  const query = req.nextUrl.search.replace(/^\?/, "");

  try {
    // Parse INSIDE the try so a malformed body returns the structured
    // {success:false,error} envelope (400) instead of an unhandled framework 500.
    let body: unknown;
    if (method !== "GET") {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          return Response.json(
            { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
            { status: 400 },
          );
        }
      }
    }

    const data = await rawCall<unknown>(fullPath, {
      method,
      body,
      query: query || undefined,
      // Sign whenever credentials exist; otherwise forward unsigned (public reads).
      auth: hasCredentials(),
    });
    return Response.json({ success: true, data });
  } catch (e) {
    const err = e instanceof ApiError ? e : new ApiError(e instanceof Error ? e.message : "Proxy error");
    const status = err.httpStatus && err.httpStatus >= 400 ? err.httpStatus : err.code === "NO_CREDENTIALS" ? 400 : 502;
    return Response.json({ success: false, error: { code: err.code, message: err.message } }, { status });
  }
}

export function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, params.path, "GET");
}
export function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, params.path, "POST");
}
export function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return handle(req, params.path, "DELETE");
}
