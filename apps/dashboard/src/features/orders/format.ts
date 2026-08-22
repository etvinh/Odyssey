import type { OrderChannel, OrderStatus } from "@odyssey/types";

// Re-exported so order screens keep one import for display helpers.
export { formatMoney, formatTime } from "../../format";

/** Order-specific display labels. Money and time live in ../../format. */

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


/**
 * The badge tone for a status. Tones carry meaning, not decoration: warning is
 * "waiting on the manager", success is "ready for the customer", neutral is
 * "done and closed".
 */
export function statusTone(
  status: OrderStatus,
): "warning" | "info" | "accent" | "success" | "neutral" | "danger" {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
      return "info";
    case "preparing":
      return "accent";
    case "ready":
      return "success";
    case "completed":
      return "neutral";
    case "cancelled":
      return "danger";
  }
}
