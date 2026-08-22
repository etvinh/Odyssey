import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, PAGE_SIZE } from "../src/features/paging";

/** A fake reader over `total` numbered rows, so the arithmetic is checkable. */
const reader = (total: number) =>
  vi.fn((page: number, pageSize: number) =>
    Promise.resolve({
      rows: Array.from(
        { length: Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)) },
        (_, i) => (page - 1) * pageSize + i,
      ),
      total,
    }),
  );

describe("fetchAllPages", () => {
  it("reads once when everything fits on one page", async () => {
    const read = reader(10);
    await fetchAllPages(read);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("reads once when the set exactly fills a page", async () => {
    const read = reader(PAGE_SIZE);
    await fetchAllPages(read);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("reads a second page when one row spills over", async () => {
    const read = reader(PAGE_SIZE + 1);
    expect(await fetchAllPages(read)).toHaveLength(PAGE_SIZE + 1);
  });

  it("returns every row, in order, across several pages", async () => {
    const rows = await fetchAllPages(reader(PAGE_SIZE * 2 + 5));
    expect(rows).toEqual(Array.from({ length: PAGE_SIZE * 2 + 5 }, (_, i) => i));
  });

  it("loses no rows to duplication or gaps", async () => {
    const rows = await fetchAllPages(reader(278));
    expect(new Set(rows).size).toBe(278);
  });

  it("handles an empty set without a second read", async () => {
    const read = reader(0);
    expect(await fetchAllPages(read)).toEqual([]);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
