/**
 * The one rule that derives open/closed.
 *
 * Here rather than in either app because the Worker and the dashboard sidebar
 * both need it, and two implementations of "are we open?" is two answers
 * waiting to disagree. The vocabulary it reads — days, opening hours — lives in
 * @odyssey/types, which the database schema also builds from.
 */
import { DAYS_OF_WEEK, type DayOfWeek, type OpeningHours } from "@odyssey/types";

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
