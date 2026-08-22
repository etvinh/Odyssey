/**
 * The time windows Home's summary is computed over, as pure functions.
 *
 * Every window is half-open — `from` inclusive, `to` exclusive — so an order
 * placed at 23:59:59 lands in today and one placed at 00:00:00 lands in
 * tomorrow, with no instant counted twice and none missed.
 *
 * No timezone is modelled: boundaries are server-local, which makes these
 * figures approximate for a restaurant in another zone. An accepted scope cut,
 * stated in PRODUCT.md.
 */

/** How many days of orders the popular-items list looks back over. */
export const POPULAR_ITEMS_DAYS = 7;

export type Window = { from: Date; to: Date };

/** Midnight at the start of the day the given instant falls in. */
export function startOfDay(at: Date): Date {
  const midnight = new Date(at);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

/**
 * `Date` normalises overflow, so adding days across a month or year boundary
 * needs no special case: 26 August plus seven days is 2 September, and 1 January
 * minus seven is 25 December.
 */
function addDays(at: Date, days: number): Date {
  const moved = new Date(at);
  moved.setDate(moved.getDate() + days);
  return moved;
}

export function summaryWindows(now: Date): {
  today: Window;
  yesterday: Window;
  popular: Window;
} {
  const todayFrom = startOfDay(now);
  const todayTo = addDays(todayFrom, 1);

  return {
    today: { from: todayFrom, to: todayTo },
    // Butts directly against today, so no order falls between the two.
    yesterday: { from: addDays(todayFrom, -1), to: todayFrom },
    // Seven whole days including today, not seven times twenty-four hours back
    // from this instant — a window that slid through the day would make the
    // list change for reasons no one watching it could explain.
    popular: { from: addDays(todayFrom, -(POPULAR_ITEMS_DAYS - 1)), to: todayTo },
  };
}
