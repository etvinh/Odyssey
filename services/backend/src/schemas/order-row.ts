import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { ORDER_ACTIONS, ORDER_STATUSES } from "@odyssey/types";
import { orders } from "../db/schema.js";

/**
 * The order list row, and the enums it is built from.
 *
 * Shared rather than defined in routes/orders.ts, because the customer drawer
 * shows a customer's recent orders using this exact shape. A bespoke subset
 * there would be a third order shape in the contract, for rows that are
 * already clickable into a real order — see planning/API.md §4.
 */

export const OrderStatusSchema = z.enum(ORDER_STATUSES).openapi("OrderStatus");
export const OrderActionSchema = z.enum(ORDER_ACTIONS).openapi("OrderAction");

/** The list row carries only what a table cell renders. */
export const OrderRowCustomer = z
  .object({ id: z.string().uuid(), name: z.string() })
  .openapi("OrderRowCustomer");

/**
 * `orderNumber` is an integer column and a string on the wire: it is a display
 * identifier, not a number to do arithmetic on. `placedAt` is likewise an ISO
 * string rather than the Date drizzle-zod would infer from the column.
 *
 * `channel` and `status` ARE derived from the table, which is the point — the
 * enum values reach the dashboard from the database and are never retyped.
 */
export const OrderRow = createSelectSchema(orders)
  .pick({ id: true, channel: true, status: true, totalCents: true })
  .extend({
    orderNumber: z.string(),
    customer: OrderRowCustomer.nullable(),
    itemCount: z.number().int(),
    placedAt: z.string(),
    allowedActions: z.array(OrderActionSchema),
  })
  .openapi("OrderRow");
