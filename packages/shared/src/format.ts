/**
 * Formatting shared by every surface that shows a figure.
 *
 * Here rather than in the dashboard because the Worker and a future native
 * client render the same money and the same timestamps, and a second
 * implementation of "how do we write $12.50" is a second answer.
 */

/** Integer cents to `$12.50`. Money is never a float in this codebase. */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
