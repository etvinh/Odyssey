import { describe, expect, it } from "vitest";
import type { OpeningHours } from "@odyssey/types";
import { dayOfWeek, serviceStatus } from "../src/service";

/**
 * Pure module, no I/O. The rule the header pill and the Worker both read, so a
 * disagreement here is a disagreement between the two surfaces.
 */

/** Open 09:00–17:00 every day, so a case only has to vary what it is testing. */
const alwaysOpen: OpeningHours[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
].map((day) => ({ day, opensAt: "09:00", closesAt: "17:00" }) as OpeningHours);

/** A Thursday. Worked out from a calendar, not from the code under test. */
const thursdayAt = (hours: number, minutes = 0) =>
  new Date(2026, 7, 20, hours, minutes); // 20 Aug 2026

describe("dayOfWeek", () => {
  it("reads Monday-first, not JavaScript's Sunday-first", () => {
    expect(dayOfWeek(thursdayAt(12))).toBe("thursday");
  });

  it("names Sunday correctly, the case the offset would break", () => {
    expect(dayOfWeek(new Date(2026, 7, 23, 12))).toBe("sunday");
  });
});

describe("serviceStatus", () => {
  it("is open mid-service", () => {
    const status = serviceStatus({ isAcceptingOrders: true, openingHours: alwaysOpen }, thursdayAt(12));
    expect(status).toEqual({ isOpen: true, reason: "open" });
  });

  it("is closed before opening", () => {
    const status = serviceStatus({ isAcceptingOrders: true, openingHours: alwaysOpen }, thursdayAt(8, 59));
    expect(status).toEqual({ isOpen: false, reason: "closed" });
  });

  it("is open on the opening minute", () => {
    expect(
      serviceStatus({ isAcceptingOrders: true, openingHours: alwaysOpen }, thursdayAt(9)).isOpen,
    ).toBe(true);
  });

  it("is closed on the closing minute", () => {
    // Half-open: a restaurant closing at 17:00 is shut at 17:00.
    expect(
      serviceStatus({ isAcceptingOrders: true, openingHours: alwaysOpen }, thursdayAt(17)).isOpen,
    ).toBe(false);
  });

  it("is closed on a day with no interval", () => {
    const hours = alwaysOpen.map((h) =>
      h.day === "thursday" ? { ...h, opensAt: null, closesAt: null } : h,
    );
    const status = serviceStatus({ isAcceptingOrders: true, openingHours: hours }, thursdayAt(12));
    expect(status).toEqual({ isOpen: false, reason: "closed" });
  });

  it("is closed when the manager has switched off, even during posted hours", () => {
    const status = serviceStatus({ isAcceptingOrders: false, openingHours: alwaysOpen }, thursdayAt(12));
    expect(status).toEqual({ isOpen: false, reason: "not_accepting" });
  });

  it("distinguishes switched-off from outside-hours", () => {
    // The pill says different things for the two, so they cannot collapse.
    const off = serviceStatus({ isAcceptingOrders: false, openingHours: alwaysOpen }, thursdayAt(12));
    const shut = serviceStatus({ isAcceptingOrders: true, openingHours: alwaysOpen }, thursdayAt(3));
    expect([off.reason, shut.reason]).toEqual(["not_accepting", "closed"]);
  });

  it("is closed when no hours are configured at all", () => {
    expect(serviceStatus({ isAcceptingOrders: true, openingHours: [] }, thursdayAt(12)).isOpen).toBe(
      false,
    );
  });
});
