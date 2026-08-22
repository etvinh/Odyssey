import { describe, expect, it } from "vitest";
import { formatMoney } from "../src/format";

/**
 * Money is integer cents everywhere in this codebase; this is the one place it
 * becomes a string, so the rounding boundaries are worth pinning.
 */
describe("formatMoney", () => {
  it("writes whole dollars with cents", () => {
    expect(formatMoney(1200)).toBe("$12.00");
  });

  it("writes a part-dollar amount", () => {
    expect(formatMoney(1250)).toBe("$12.50");
  });

  it("pads a single-cent amount", () => {
    expect(formatMoney(5)).toBe("$0.05");
  });

  it("writes zero rather than an empty string", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("does not lose a cent to floating point", () => {
    // 1999 / 100 is 19.990000000000002 before toFixed rounds it.
    expect(formatMoney(1999)).toBe("$19.99");
  });
});
