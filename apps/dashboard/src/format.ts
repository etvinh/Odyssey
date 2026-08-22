/**
 * Formatting shared across features.
 *
 * PRODUCT.md puts `formatMoney` in `packages/shared` eventually; it lives here
 * until something outside the dashboard needs it, rather than standing up a
 * package for one consumer.
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
