/**
 * The domain vocabulary for orders, in one place. See ADR-0004.
 *
 * These are plain `as const` tuples rather than re-exports of the Drizzle
 * enums, and the direction of the dependency is deliberate: `schema.ts` builds
 * its `pgEnum`s *from* these values. Deriving them the other way would make
 * this package import the Worker's schema — a cycle, since the schema needs the
 * values to declare the enums — and would pull `drizzle-orm` into the Metro
 * bundle for the sake of six string literals. The API *shapes* still flow
 * drizzle-zod -> OpenAPI -> Orval exactly as the ADR intends; only the enum
 * values start here.
 */

/** Where an order sits in its lifecycle. Ordered as the lifecycle runs. */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** A status an order can never leave. There is no reopening. */
export const TERMINAL_ORDER_STATUSES = ["completed", "cancelled"] as const;

export type TerminalOrderStatus = (typeof TERMINAL_ORDER_STATUSES)[number];

export function isTerminalOrderStatus(status: OrderStatus): status is TerminalOrderStatus {
  return (TERMINAL_ORDER_STATUSES as readonly OrderStatus[]).includes(status);
}

/** How an order reached the restaurant. */
export const ORDER_CHANNELS = ["dine_in", "takeaway", "delivery"] as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[number];

/**
 * A named request to move an order to its next status. Clients ask for these;
 * only the server decides whether one is legal. The transition table itself
 * lives in the Worker and has no client twin — see ADR-0003.
 */
export const ORDER_ACTIONS = [
  "confirm",
  "start_preparing",
  "mark_ready",
  "complete",
  "cancel",
] as const;

export type OrderAction = (typeof ORDER_ACTIONS)[number];
