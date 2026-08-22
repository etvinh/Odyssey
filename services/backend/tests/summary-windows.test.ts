import { describe, expect, it } from "vitest";
import { startOfDay, summaryWindows } from "../src/domain/summary-windows.js";

/**
 * Pure module, no I/O. No timezone is modelled anywhere in this build, so every
 * boundary here is server-local — see PRODUCT.md's tradeoffs.
 */

// A Thursday afternoon. Worked out from a calendar, not from the code.
const thursdayAfternoon = new Date(2026, 7, 20, 15, 42, 30, 500);

describe("startOfDay", () => {
  it("winds back to midnight", () => {
    expect(startOfDay(thursdayAfternoon)).toEqual(new Date(2026, 7, 20, 0, 0, 0, 0));
  });

  it("leaves a time already at midnight alone", () => {
    const midnight = new Date(2026, 7, 20, 0, 0, 0, 0);
    expect(startOfDay(midnight)).toEqual(midnight);
  });

  it("does not roll into the previous day", () => {
    expect(startOfDay(new Date(2026, 7, 20, 0, 0, 0, 1)).getDate()).toBe(20);
  });
});

describe("summaryWindows", () => {
  const windows = summaryWindows(thursdayAfternoon);

  it("starts today at midnight", () => {
    expect(windows.today.from).toEqual(new Date(2026, 7, 20, 0, 0, 0, 0));
  });

  it("ends today at tomorrow's midnight, so the whole day counts", () => {
    // Half-open: an order placed at 23:59 today must land in today, and one
    // placed at 00:00 tomorrow must not.
    expect(windows.today.to).toEqual(new Date(2026, 7, 21, 0, 0, 0, 0));
  });

  it("makes yesterday the day immediately before", () => {
    expect(windows.yesterday.from).toEqual(new Date(2026, 7, 19, 0, 0, 0, 0));
    expect(windows.yesterday.to).toEqual(new Date(2026, 7, 20, 0, 0, 0, 0));
  });

  it("leaves no gap between yesterday and today", () => {
    expect(windows.yesterday.to).toEqual(windows.today.from);
  });

  it("spans seven days for popular items, ending now", () => {
    expect(windows.popular.from).toEqual(new Date(2026, 7, 14, 0, 0, 0, 0));
    expect(windows.popular.to).toEqual(windows.today.to);
  });

  it("crosses a month boundary correctly", () => {
    // 1 Sep back seven days is 26 Aug, not day -6 of September.
    const windows = summaryWindows(new Date(2026, 8, 1, 12));
    expect(windows.popular.from).toEqual(new Date(2026, 7, 26, 0, 0, 0, 0));
  });

  it("crosses a year boundary correctly", () => {
    const windows = summaryWindows(new Date(2027, 0, 2, 12));
    expect(windows.yesterday.from).toEqual(new Date(2027, 0, 1, 0, 0, 0, 0));
    expect(windows.popular.from).toEqual(new Date(2026, 11, 27, 0, 0, 0, 0));
  });
});
