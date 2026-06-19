import { describe, it, expect } from "vitest";
import { fromE6, toE6, pricePct, cents, usd, isActive } from "./format";

describe("fromE6", () => {
  it("converts an e6 number to a plain float", () => {
    expect(fromE6(650000)).toBe(0.65);
    expect(fromE6(2504056000)).toBeCloseTo(2504.056, 6);
    expect(fromE6(1_000_000)).toBe(1);
  });

  it("converts an e6 numeric string to a plain float", () => {
    expect(fromE6("650000")).toBe(0.65);
    expect(fromE6("2504056000")).toBeCloseTo(2504.056, 6);
  });

  it("treats null/undefined as 0", () => {
    expect(fromE6(null)).toBe(0);
    expect(fromE6(undefined)).toBe(0);
  });

  it("treats non-finite / unparseable values as 0", () => {
    expect(fromE6(Number.NaN)).toBe(0);
    expect(fromE6(Number.POSITIVE_INFINITY)).toBe(0);
    expect(fromE6(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(fromE6("not-a-number")).toBe(0);
  });

  it("handles 0 and negatives", () => {
    expect(fromE6(0)).toBe(0);
    expect(fromE6(-500000)).toBe(-0.5);
  });
});

describe("toE6", () => {
  it("converts float dollars to an e6 integer", () => {
    expect(toE6(0.65)).toBe(650000);
    expect(toE6(1)).toBe(1_000_000);
    expect(toE6(0)).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    // 1.0000005 * 1e6 = 1000000.5 -> rounds up to 1000001
    expect(toE6(1.0000005)).toBe(1000001);
    // 1.0000004 * 1e6 = 1000000.4 -> rounds down to 1000000
    expect(toE6(1.0000004)).toBe(1000000);
  });

  it("round-trips with fromE6 for clean values", () => {
    expect(fromE6(toE6(2.5))).toBeCloseTo(2.5, 6);
  });
});

describe("pricePct", () => {
  it("converts an e6 probability to a percent number", () => {
    expect(pricePct(650000)).toBe(65);
    expect(pricePct(500000)).toBe(50);
    expect(pricePct(21000)).toBe(2); // 0.021 -> 2.1 -> rounds to 2
  });

  it("clamps above 100% (one-sided synthetic mids)", () => {
    expect(pricePct(1_030_000)).toBe(100);
    expect(pricePct(2_000_000)).toBe(100);
  });

  it("clamps below 0%", () => {
    expect(pricePct(-50000)).toBe(0);
    expect(pricePct(-1)).toBe(0);
  });

  it("treats null/undefined as 0", () => {
    expect(pricePct(null)).toBe(0);
    expect(pricePct(undefined)).toBe(0);
  });

  it("never returns a value outside [0, 100]", () => {
    for (const v of [-5_000_000, -1, 0, 1, 500000, 999999, 1_000_000, 1_500_000, 9_999_999]) {
      const p = pricePct(v);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("cents", () => {
  it("renders an e6 probability as cents", () => {
    expect(cents(650000)).toBe("65¢");
    expect(cents(21000)).toBe("2¢"); // 0.021 -> 2.1 -> rounds to 2
    expect(cents(1_000_000)).toBe("100¢");
    expect(cents(0)).toBe("0¢");
  });

  it("treats null/undefined as 0¢", () => {
    expect(cents(null)).toBe("0¢");
    expect(cents(undefined)).toBe("0¢");
  });
});

describe("usd", () => {
  it("formats an e6 amount as a USD currency string", () => {
    expect(usd(650000)).toBe("$0.65");
    expect(usd(1_000_000)).toBe("$1.00");
    expect(usd(2504056000)).toBe("$2,504.06");
  });

  it("treats null/undefined as $0.00", () => {
    expect(usd(null)).toBe("$0.00");
    expect(usd(undefined)).toBe("$0.00");
  });

  it("respects a custom decimal-places argument", () => {
    expect(usd(650000, 0)).toBe("$1"); // 0.65 rounded to 0 dp
    expect(usd(1_234_560, 4)).toBe("$1.2346");
  });
});

describe("isActive", () => {
  it("is true for ACTIVE / active (case-insensitive)", () => {
    expect(isActive("ACTIVE")).toBe(true);
    expect(isActive("active")).toBe(true);
    expect(isActive("Active")).toBe(true);
  });

  it("is false for other statuses, empty, and nullish", () => {
    expect(isActive("x")).toBe(false);
    expect(isActive("PENDING")).toBe(false);
    expect(isActive("RESOLVED")).toBe(false);
    expect(isActive("")).toBe(false);
    expect(isActive(null)).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
});
