import { beforeAll, describe, expect, it } from "vitest";
import {
  createPendingOrder,
  get,
  post,
  readJson,
  type ApiErrorBody,
  type OrderAction,
  type OrderDetail,
  type OrderStatus,
} from "./setup.js";

const ALL_ACTIONS: OrderAction[] = [
  "confirm",
  "start_preparing",
  "mark_ready",
  "complete",
  "cancel",
];

/** The table from ADR-0003, restated here so the test is an independent check. */
const LEGAL: Record<OrderStatus, Partial<Record<OrderAction, OrderStatus>>> = {
  pending: { confirm: "confirmed", cancel: "cancelled" },
  confirmed: { start_preparing: "preparing", cancel: "cancelled" },
  preparing: { mark_ready: "ready", cancel: "cancelled" },
  ready: { complete: "completed", cancel: "cancelled" },
  completed: {},
  cancelled: {},
};

const act = (id: string, action: OrderAction) => post(`/orders/${id}/actions`, { action });

/** Walks a fresh order up to `target` using only legal moves. */
async function orderAt(target: OrderStatus): Promise<OrderDetail> {
  const order = await createPendingOrder();
  const route: Partial<Record<OrderStatus, OrderAction[]>> = {
    pending: [],
    confirmed: ["confirm"],
    preparing: ["confirm", "start_preparing"],
    ready: ["confirm", "start_preparing", "mark_ready"],
    completed: ["confirm", "start_preparing", "mark_ready", "complete"],
    cancelled: ["cancel"],
  };

  let current = order;
  for (const action of route[target] ?? []) {
    current = await readJson<OrderDetail>(await act(order.id, action));
  }
  return current;
}

describe("POST /orders/{id}/actions — the transition table", () => {
  // Every legal move, driven against a real order rather than asserted in the
  // abstract. One order per case, so no test depends on another's leftovers.
  for (const [from, moves] of Object.entries(LEGAL) as [
    OrderStatus,
    Partial<Record<OrderAction, OrderStatus>>,
  ][]) {
    for (const action of ALL_ACTIONS) {
      const expected = moves[action];

      if (expected) {
        describe(`${action} from ${from}`, () => {
          let response: Response;
          let body: OrderDetail;

          beforeAll(async () => {
            const order = await orderAt(from);
            response = await act(order.id, action);
            body = await readJson(response);
          });

          it("responds 200", () => {
            expect(response.status).toBe(200);
          });

          it(`moves the order to ${expected}`, () => {
            expect(body.status).toBe(expected);
          });

          it("appends one timeline entry for the new status", () => {
            expect(body.timeline.at(-1)?.status).toBe(expected);
          });

          it("recomputes allowedActions for the new status", () => {
            expect(body.allowedActions).toEqual(Object.keys(LEGAL[expected]));
          });
        });
      } else {
        describe(`${action} from ${from}`, () => {
          let response: Response;
          let body: ApiErrorBody;

          beforeAll(async () => {
            const order = await orderAt(from);
            response = await act(order.id, action);
            body = await readJson(response);
          });

          it("responds 409", () => {
            expect(response.status).toBe(409);
          });

          it("reports INVALID_TRANSITION", () => {
            expect(body.error.code).toBe("INVALID_TRANSITION");
          });
        });
      }
    }
  }
});

describe("POST /orders/{id}/actions — terminal orders", () => {
  it("leaves a completed order completed after a rejected action", async () => {
    const order = await orderAt("completed");
    await act(order.id, "cancel");
    const after = await readJson<OrderDetail>(await get(`/orders/${order.id}`));
    expect(after.status).toBe("completed");
  });

  it("writes no timeline entry for a rejected action", async () => {
    const order = await orderAt("completed");
    const before = order.timeline.length;
    await act(order.id, "cancel");
    const after = await readJson<OrderDetail>(await get(`/orders/${order.id}`));
    expect(after.timeline.length).toBe(before);
  });

  it("offers no actions once cancelled", async () => {
    const order = await orderAt("cancelled");
    expect(order.allowedActions).toEqual([]);
  });

  it("keeps every status it passed through in the timeline", async () => {
    const order = await orderAt("completed");
    expect(order.timeline.map((entry) => entry.status)).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
    ]);
  });
});

describe("POST /orders/{id}/actions — validation", () => {
  it("404s an unknown order", async () => {
    const response = await act("0f8fad5b-d9cb-469f-a165-70867728950e", "confirm");
    expect(response.status).toBe(404);
  });

  it("reports NOT_FOUND for an unknown order", async () => {
    const body = await readJson<ApiErrorBody>(
      await act("0f8fad5b-d9cb-469f-a165-70867728950e", "confirm"),
    );
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("422s an id that is not a uuid", async () => {
    expect((await act("not-a-uuid", "confirm")).status).toBe(422);
  });

  it("422s an action that is not in the enum", async () => {
    const order = await createPendingOrder();
    const response = await post(`/orders/${order.id}/actions`, { action: "teleport" });
    expect(response.status).toBe(422);
  });

  it("422s a body with no action", async () => {
    const order = await createPendingOrder();
    expect((await post(`/orders/${order.id}/actions`, {})).status).toBe(422);
  });
});
