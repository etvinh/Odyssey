import { sql } from "drizzle-orm";
import type { OrderStatus } from "@odyssey/types";
import { customers, orderItems, orders } from "../db/schema.js";
import { allowedActions } from "./order-actions.js";

/**
 * The columns behind an order list row, and the mapper onto the wire shape.
 *
 * One definition, two readers: the orders list and a customer's recent orders.
 * Both must have `leftJoin(customers, …)` in scope for the customer columns.
 */
export const orderRowColumns = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  channel: orders.channel,
  status: orders.status,
  totalCents: orders.totalCents,
  placedAt: orders.placedAt,
  customerId: customers.id,
  customerName: customers.name,
  itemCount: sql<number>`(
    select count(*) from ${orderItems} where ${orderItems.orderId} = ${orders.id}
  )`.mapWith(Number),
};

type OrderRowSource = {
  id: string;
  orderNumber: number;
  channel: "dine_in" | "takeaway" | "delivery";
  status: OrderStatus;
  totalCents: number;
  placedAt: Date;
  customerId: string | null;
  customerName: string | null;
  itemCount: number;
};

export function toOrderRow(row: OrderRowSource) {
  return {
    id: row.id,
    orderNumber: String(row.orderNumber),
    channel: row.channel,
    status: row.status,
    totalCents: row.totalCents,
    placedAt: row.placedAt.toISOString(),
    itemCount: row.itemCount,
    customer: row.customerId ? { id: row.customerId, name: row.customerName ?? "" } : null,
    // On the row, not just the detail. Without it a list-level action button
    // would have to re-derive the state machine on the client. See ADR-0003.
    allowedActions: allowedActions(row.status),
  };
}
