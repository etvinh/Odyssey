/**
 * The domain vocabulary for service. Values only — the rule that derives
 * open/closed from them lives in @odyssey/shared.
 *
 * The split follows ADR-0004: `schema.ts` builds its `pgEnum`s from this
 * package, so anything the database needs has to sit here, and this package
 * must stay importable by the Worker without pulling behaviour along with it.
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
