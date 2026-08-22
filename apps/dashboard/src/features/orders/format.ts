import type { OrderChannel, OrderStatus } from "@odyssey/types";

/**
 * Display helpers for the orders screens.
 *
 * `formatMoney` belongs in packages/shared once that package exists — see
 * PRODUCT.md. It lives here until something outside orders needs it, rather
 * than standing up a package for one consumer.
 */

/** Integer cents to `$12.50`. Money is never a float in this codebase. */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const CHANNEL_LABELS: Record<OrderChannel, string> = {
  dine_in: "Dine in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export function channelLabel(channel: OrderChannel): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * The verb for an action button. These are the server's action names made
 * readable — the set of buttons still comes from `allowedActions`, never from
 * this object.
 */
const ACTION_LABELS: Record<string, string> = {
  confirm: "Accept",
  start_preparing: "Start preparing",
  mark_ready: "Mark ready",
  complete: "Complete",
  cancel: "Cancel",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
