/**
 * How far back the orders list reaches.
 *
 * Orders older than this are archived: still stored, still readable by id, still
 * counted in a customer's derived totals and in the summary — just not part of
 * the working list. The dashboard holds the whole list in memory to filter and
 * tally it, so the list has to be a set that stays small however long the
 * restaurant has been trading. A day of service is that set.
 *
 * A rolling window rather than "since midnight": at 00:05 a manager is still
 * working the orders from ten minutes ago, and a window that resets at midnight
 * would empty the screen mid-service.
 *
 * Server-local, like every other boundary here — no timezone is modelled.
 */
export const ORDER_WINDOW_HOURS = 24;

/** The instant the live window opens, counting back from the one given. */
export function activeOrdersSince(now: Date): Date {
  return new Date(now.getTime() - ORDER_WINDOW_HOURS * 3_600_000);
}
