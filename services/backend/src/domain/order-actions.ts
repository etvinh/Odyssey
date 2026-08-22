import { ORDER_ACTIONS, type OrderAction, type OrderStatus } from "@odyssey/types";

/**
 * The order state machine. This module is the only place it exists — see
 * ADR-0003. The client posts a named action and the server decides; every order
 * response carries `allowedActions` so the UI can render buttons without
 * re-deriving any of this.
 *
 * If you ever find yourself wanting a copy of this table in the dashboard, the
 * missing field on the response is the bug, not the absent copy.
 */
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderAction, OrderStatus>>> = {
  pending: { confirm: "confirmed", cancel: "cancelled" },
  confirmed: { start_preparing: "preparing", cancel: "cancelled" },
  preparing: { mark_ready: "ready", cancel: "cancelled" },
  ready: { complete: "completed", cancel: "cancelled" },
  // Terminal. There is no reopening, so every action is illegal from here.
  completed: {},
  cancelled: {},
};

/**
 * The actions legal from `status`, in lifecycle order — the advancing action
 * first, `cancel` last. Callers lean on that order: the inline next-action
 * button on a list row renders `allowedActions[0]`.
 *
 * `cancel` is legal all the way from `ready`, because a plated order still gets
 * cancelled when the customer walks out. Forbidding it would be a modelling
 * artifact rather than a rule the restaurant actually has.
 */
export function allowedActions(status: OrderStatus): OrderAction[] {
  const legal = TRANSITIONS[status];
  return ORDER_ACTIONS.filter((action) => action in legal);
}

/** The status `action` moves an order to, or undefined if it is not legal. */
export function nextStatus(status: OrderStatus, action: OrderAction): OrderStatus | undefined {
  return TRANSITIONS[status][action];
}
