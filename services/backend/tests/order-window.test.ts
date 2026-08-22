import { describe, expect, it } from "vitest";
import { ORDER_WINDOW_HOURS, activeOrdersSince } from "../src/domain/order-window.js";

/** Pure module, no I/O. Server-local, like every other boundary in this build. */
describe("activeOrdersSince", () => {
  const noon = new Date(2026, 7, 20, 12, 0, 0, 0);

  it("looks back a rolling day, not to midnight", () => {
    expect(activeOrdersSince(noon)).toEqual(new Date(2026, 7, 19, 12, 0, 0, 0));
  });

  it("keeps the window the documented length", () => {
    const from = activeOrdersSince(noon);
    expect((noon.getTime() - from.getTime()) / 3_600_000).toBe(ORDER_WINDOW_HOURS);
  });

  it("crosses a month boundary correctly", () => {
    expect(activeOrdersSince(new Date(2026, 8, 1, 6))).toEqual(new Date(2026, 7, 31, 6));
  });

  it("does not mutate the instant it is given", () => {
    const now = new Date(noon);
    activeOrdersSince(now);
    expect(now).toEqual(noon);
  });
});
