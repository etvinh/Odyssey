import { describe, expect, it } from "vitest";
import { pageWindow } from "../src/domain/pagination.js";

/**
 * Pure module, no I/O. Expected values are worked examples rather than the
 * formula the implementation uses, so these can actually disagree with the code.
 */

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
