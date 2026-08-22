import type { Customer, OrderRow } from "@odyssey/api-client";

/**
 * Shared test environment. Registered as vitest `setupFiles`, and the single
 * place tests import their fixtures from.
 */

/**
 * An order row, with only the fields a test cares about spelled out. The rest
 * are filled with values no assertion reads, so a test's literals are the
 * thing under test rather than noise.
 */
export function orderRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    // Derived from the order number so fixtures stay distinct without a caller
    // having to spell out both.
    id: `order-${overrides.orderNumber ?? "1000"}`,
    orderNumber: "1000",
    customer: null,
    channel: "dine_in",
    status: "pending",
    itemCount: 1,
    totalCents: 1000,
    placedAt: "2026-08-22T12:00:00.000Z",
    allowedActions: [],
    ...overrides,
  };
}

/** A customer row, with only the fields a test cares about spelled out. */
export function customerRow(overrides: Partial<Customer> = {}): Customer {
  return {
    id: `customer-${overrides.name ?? "1"}`,
    name: "Priya Raman",
    phone: null,
    email: null,
    orderCount: 0,
    totalSpendCents: 0,
    lastOrderAt: null,
    ...overrides,
  };
}
