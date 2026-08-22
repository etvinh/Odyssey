/**
 * The domain vocabulary for service, and the one rule that derives open/closed.
 *
 * The rule lives here rather than in either app because the Worker and the
 * header pill both need it, and two implementations of "are we open?" is two
 * answers waiting to disagree. PRODUCT.md sketches this as `packages/shared`;
 * it sits in @odyssey/types because that package is already the shared home for
 * domain values both sides import, and standing up a second one for a single
 * function buys nothing.
 */

/**
 * Ordered Monday-first, the way a restaurant's week reads on a door sign —
 * deliberately not JavaScript's Sunday-first `Date#getDay` order, which is an
 * implementation detail of the runtime rather than of the domain.
 */
export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/** One day's trading interval. A null pair is a day the restaurant is closed. */
export type OpeningHours = {
  day: DayOfWeek;
  opensAt: string | null;
  closesAt: string | null;
};

/** What the header pill shows. Never stored — always derived. */
export type ServiceStatus = { isOpen: boolean; reason: "not_accepting" | "closed" | "open" };

/** The day of the week a Date falls on, in this module's Monday-first order. */
export function dayOfWeek(at: Date): DayOfWeek {
  // getDay is Sunday-first; DAYS_OF_WEEK is Monday-first.
  return DAYS_OF_WEEK[(at.getDay() + 6) % 7]!;
}

/** "HH:MM" to minutes since midnight, for comparing against a wall clock. */
export function minutesFromTime(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/**
 * Whether the restaurant is open right now.
 *
 * `isAcceptingOrders` is the manual override and wins outright: a manager who
 * has switched off is closed even during posted hours. Otherwise the current
 * wall clock is compared against the day's interval, with no timezone modelled
 * — comparison is server-local, an accepted scope cut in PRODUCT.md.
 *
 * The interval is half-open: a restaurant closing at 22:00 is shut at 22:00.
 */
export function serviceStatus(
  settings: { isAcceptingOrders: boolean; openingHours: OpeningHours[] },
  now: Date,
): ServiceStatus {
  if (!settings.isAcceptingOrders) return { isOpen: false, reason: "not_accepting" };

  const today = settings.openingHours.find((hours) => hours.day === dayOfWeek(now));
  if (!today?.opensAt || !today.closesAt) return { isOpen: false, reason: "closed" };

  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen =
    minutes >= minutesFromTime(today.opensAt) && minutes < minutesFromTime(today.closesAt);

  return isOpen ? { isOpen: true, reason: "open" } : { isOpen: false, reason: "closed" };
}
