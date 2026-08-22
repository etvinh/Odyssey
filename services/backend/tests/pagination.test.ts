import { describe, expect, it } from "vitest";
import { pageWindow, totalFromCounts } from "../src/domain/pagination.js";

/**
 * Pure module, no I/O. Expected values are worked examples rather than the
 * formula the implementation uses, so these can actually disagree with the code.
 */

describe("totalFromCounts", () => {
  // A real statusCounts payload. 13+11+9+8+95+14 = 150.
  const counts = {
    pending: 13,
    confirmed: 11,
    preparing: 9,
    ready: 8,
    completed: 95,
    cancelled: 14,
  };

  it("sums every bucket when no filter is applied", () => {
    expect(totalFromCounts(counts)).toBe(150);
  });

  it("returns one bucket when a filter is applied", () => {
    expect(totalFromCounts(counts, "pending")).toBe(13);
  });

  it("returns the bucket even when it is empty", () => {
    expect(totalFromCounts({ ...counts, ready: 0 }, "ready")).toBe(0);
  });

  it("totals zero when every bucket is empty", () => {
    expect(totalFromCounts({ pending: 0, completed: 0 })).toBe(0);
  });

  it("does not depend on how many rows a page happened to return", () => {
    // The defect this module exists to remove: the total was previously read
    // off the returned rows, so an empty page reported nothing.
    expect(totalFromCounts(counts)).toBe(150);
  });
});

describe("pageWindow", () => {
  it("starts at offset zero on the first page", () => {
    expect(pageWindow(1, 25)).toEqual({ limit: 25, offset: 0 });
  });

  it("skips one page of rows on the second page", () => {
    expect(pageWindow(2, 25)).toEqual({ limit: 25, offset: 25 });
  });

  it("skips 98 pages of rows on page 99", () => {
    expect(pageWindow(99, 25)).toEqual({ limit: 25, offset: 2450 });
  });

  it("honours a page size that is not the default", () => {
    expect(pageWindow(3, 10)).toEqual({ limit: 10, offset: 20 });
  });
});
