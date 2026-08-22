import type { OrderRow } from "@odyssey/api-client";
import { ORDER_STATUSES, type OrderStatus } from "@odyssey/types";

/**
 * What the filter bar is asking for. `"all"` is a real choice rather than an
 * absent status, so the segmented control always has a selected segment.
 */
export type OrderFilter = {
  status: OrderStatus | "all";
  search: string;
};

/** The orders a filter leaves visible, in the order they came in. */
export function filterOrders(rows: OrderRow[], filter: OrderFilter): OrderRow[] {
  const needle = filter.search.trim().toLowerCase();
  return rows.filter((order) => {
    if (filter.status !== "all" && order.status !== filter.status) return false;
    if (!needle) return true;
    // The same two fields the server used to search: an order number, or the
    // customer's name. A walk-in has no name to match, only its number.
    return (
      order.orderNumber.toLowerCase().includes(needle) ||
      (order.customer?.name.toLowerCase().includes(needle) ?? false)
    );
  });
}

/**
 * How many orders sit at each status. Zero-filled from ORDER_STATUSES, so the
 * shape is total and a filter chip never has a hole to render around.
 *
 * This replaced `meta.statusCounts` on the list read: the dashboard holds every
 * order, and a count served from two places is a count that can disagree with
 * itself mid-render.
 */
export function tallyStatuses(rows: OrderRow[]): Record<OrderStatus, number> {
  const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
    OrderStatus,
    number
  >;
  for (const order of rows) counts[order.status] += 1;
  return counts;
}
