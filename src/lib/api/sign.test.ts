import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { signRequest } from "./sign";

// Fake credentials only — NEVER put a real secret in tests.
const API_KEY = "pk_test_demo_key";
const API_SECRET = "sk_test_demo_secret_do_not_use";

/**
 * Independent, low-level re-implementation of the documented recipe.
 * It signs the method string EXACTLY as given (no upper-casing) so tests can
 * prove that signRequest is the one normalizing case.
 */
function expectedSignature(secret: string, timestamp: string, method: string, path: string, body: string): string {
  const message = `${timestamp}${method}${path}${body}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

describe("signRequest", () => {
  it("returns the three required headers", () => {
    const h = signRequest(API_KEY, API_SECRET, "GET", "/api/v1/prediction/collections", "");
    expect(h).toHaveProperty("X-API-KEY");
    expect(h).toHaveProperty("X-TIMESTAMP");
    expect(h).toHaveProperty("X-SIGNATURE");
  });

  it("passes the API key through verbatim", () => {
    const h = signRequest(API_KEY, API_SECRET, "GET", "/api/v1/x", "");
    expect(h["X-API-KEY"]).toBe(API_KEY);
  });

  it("emits X-TIMESTAMP as a numeric ms-epoch string (~13 digits)", () => {
    const before = Date.now();
    const h = signRequest(API_KEY, API_SECRET, "GET", "/api/v1/x", "");
    const after = Date.now();
    expect(h["X-TIMESTAMP"]).toMatch(/^\d{13}$/);
    const ts = Number(h["X-TIMESTAMP"]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("signature equals hex(HMAC_SHA256(secret, ts+METHOD+path+body)) using the RETURNED timestamp", () => {
    const path = "/api/v1/prediction/orders";
    const body = JSON.stringify({ marketId: "42", side: 0, outcomeIndex: 0, priceE6: 650000, amount: 10 });
    const h = signRequest(API_KEY, API_SECRET, "POST", path, body);
    // Recompute with the EXACT timestamp the function chose — never assume a clock.
    const expected = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "POST", path, body);
    expect(h["X-SIGNATURE"]).toBe(expected);
    // sanity: lowercase hex of the right length
    expect(h["X-SIGNATURE"]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("upper-cases the method in the signed message (lowercase + mixed case)", () => {
    const path = "/api/v1/prediction/orders";
    const body = "";

    // Lowercase input must sign as if it were POST.
    const lower = signRequest(API_KEY, API_SECRET, "post", path, body);
    expect(lower["X-SIGNATURE"]).toBe(
      expectedSignature(API_SECRET, lower["X-TIMESTAMP"], "POST", path, body),
    );
    // And it must NOT match a message that kept the literal lowercase "post".
    expect(lower["X-SIGNATURE"]).not.toBe(
      expectedSignature(API_SECRET, lower["X-TIMESTAMP"], "post", path, body),
    );

    // Mixed case is normalized to POST too.
    const mixed = signRequest(API_KEY, API_SECRET, "PoSt", path, body);
    expect(mixed["X-SIGNATURE"]).toBe(
      expectedSignature(API_SECRET, mixed["X-TIMESTAMP"], "POST", path, body),
    );
  });

  it("INCLUDES the body for DELETE (cancel-order carries a signed body)", () => {
    const path = "/api/v1/prediction/orders/abc-123";
    const body = JSON.stringify({ reason: "user_cancel" });
    const h = signRequest(API_KEY, API_SECRET, "DELETE", path, body);
    const withBody = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "DELETE", path, body);
    const withoutBody = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "DELETE", path, "");
    expect(h["X-SIGNATURE"]).toBe(withBody);
    // Prove the body actually participated — empty-body signature must differ.
    expect(h["X-SIGNATURE"]).not.toBe(withoutBody);
  });

  it("works for GET with an empty body", () => {
    const path = "/api/v1/prediction/collections";
    const h = signRequest(API_KEY, API_SECRET, "GET", path, "");
    const expected = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "GET", path, "");
    expect(h["X-SIGNATURE"]).toBe(expected);
  });

  it("does NOT include any query string in the signed message (path only)", () => {
    // The caller is responsible for passing path WITHOUT query; signing it as given
    // means a path with no query is what produces the valid signature.
    const path = "/api/v1/prediction/markets";
    const h = signRequest(API_KEY, API_SECRET, "GET", path, "");
    const correct = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "GET", path, "");
    const withQuery = expectedSignature(API_SECRET, h["X-TIMESTAMP"], "GET", `${path}?page=1`, "");
    expect(h["X-SIGNATURE"]).toBe(correct);
    expect(h["X-SIGNATURE"]).not.toBe(withQuery);
  });

  it("a different secret produces a different signature for the same request", () => {
    const path = "/api/v1/x";
    const a = signRequest(API_KEY, "secret-a", "GET", path, "");
    // Recompute b against a's timestamp to isolate the secret as the only variable.
    const bSig = expectedSignature("secret-b", a["X-TIMESTAMP"], "GET", path, "");
    expect(a["X-SIGNATURE"]).not.toBe(bSig);
  });
});
