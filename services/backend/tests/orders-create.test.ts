import { beforeAll, describe, expect, it } from "vitest";
import {
  anyAvailableMenuItem,
  anyUnavailableMenuItem,
  get,
  post,
  readJson,
  withDb,
  type ApiErrorBody,
  type OrderDetail,
} from "./setup.js";
import { customers } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("POST /orders", () => {
  let response: Response;
  let body: OrderDetail;
  let priceCents: number;

  beforeAll(async () => {
    const item = await anyAvailableMenuItem();
    priceCents = item.priceCents;
    response = await post("/orders", {
      channel: "takeaway",
      kitchenNote: "No chilli please.",
      items: [{ menuItemId: item.id, quantity: 3 }],
    });
    body = await readJson(response);
  });

  it("responds 201", () => {
    expect(response.status).toBe(201);
  });

  it("creates the order pending, since auto-accept is seeded off", () => {
    expect(body.status).toBe("pending");
  });

  it("computes the total server-side", () => {
    expect(body.totalCents).toBe(priceCents * 3);
  });

  it("stores the line total at write time", () => {
    expect(body.items[0]?.lineTotalCents).toBe(priceCents * 3);
  });

  it("snapshots the unit price onto the order item", () => {
    expect(body.items[0]?.unitPriceCents).toBe(priceCents);
  });

  it("keeps the kitchen note", () => {
    expect(body.kitchenNote).toBe("No chilli please.");
  });

  it("writes the first timeline entry", () => {
    expect(body.timeline).toEqual([{ status: "pending", changedAt: expect.any(String) }]);
  });

  it("offers the pending actions", () => {
    expect(body.allowedActions).toEqual(["confirm", "cancel"]);
  });

  it("issues an order number in the display range", () => {
    expect(Number(body.orderNumber)).toBeGreaterThanOrEqual(1000);
  });
});

describe("POST /orders — customer union", () => {
  it("creates a walk-in when the key is omitted", async () => {
    const item = await anyAvailableMenuItem();
    const body = await readJson<OrderDetail>(
      await post("/orders", { channel: "dine_in", items: [{ menuItemId: item.id, quantity: 1 }] }),
    );
    expect(body.customer).toBeNull();
  });

  it("attaches an existing customer by id", async () => {
    const item = await anyAvailableMenuItem();
    const existing = await withDb((db) =>
      db.select({ id: customers.id, name: customers.name }).from(customers).limit(1),
    );
    const body = await readJson<OrderDetail>(
      await post("/orders", {
        customer: { id: existing[0]!.id },
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      }),
    );
    expect(body.customer?.id).toBe(existing[0]!.id);
  });

  it("creates a new customer inline", async () => {
    const item = await anyAvailableMenuItem();
    const name = `Inline Diner ${Date.now()}`;
    const body = await readJson<OrderDetail>(
      await post("/orders", {
        customer: { name, phone: "+44 7700 900123" },
        channel: "delivery",
        items: [{ menuItemId: item.id, quantity: 1 }],
      }),
    );
    expect(body.customer?.name).toBe(name);
  });

  it("422s an unknown customer id", async () => {
    const item = await anyAvailableMenuItem();
    const response = await post("/orders", {
      customer: { id: "0f8fad5b-d9cb-469f-a165-70867728950e" },
      channel: "dine_in",
      items: [{ menuItemId: item.id, quantity: 1 }],
    });
    expect(response.status).toBe(422);
  });

  it("keys a new-customer field error as customer.name", async () => {
    const item = await anyAvailableMenuItem();
    const body = await readJson<ApiErrorBody>(
      await post("/orders", {
        customer: { name: "" },
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      }),
    );
    expect(Object.keys(body.error.fields ?? {})).toContain("customer.name");
  });
});

describe("POST /orders — rejections", () => {
  it("409s an unavailable menu item", async () => {
    const unavailable = await anyUnavailableMenuItem();
    const response = await post("/orders", {
      channel: "dine_in",
      items: [{ menuItemId: unavailable.id, quantity: 1 }],
    });
    expect(response.status).toBe(409);
  });

  it("names the item in the message", async () => {
    const unavailable = await anyUnavailableMenuItem();
    const body = await readJson<ApiErrorBody>(
      await post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: unavailable.id, quantity: 1 }],
      }),
    );
    expect(body.error.message).toContain(unavailable.name);
  });

  it("reports ITEM_UNAVAILABLE", async () => {
    const unavailable = await anyUnavailableMenuItem();
    const body = await readJson<ApiErrorBody>(
      await post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: unavailable.id, quantity: 1 }],
      }),
    );
    expect(body.error.code).toBe("ITEM_UNAVAILABLE");
  });

  it("strands no customer when the order is rejected", async () => {
    // The whole reason the customer insert lives inside the order transaction.
    const name = `Rollback Probe ${Date.now()}`;
    const unavailable = await anyUnavailableMenuItem();

    await post("/orders", {
      customer: { name },
      channel: "dine_in",
      items: [{ menuItemId: unavailable.id, quantity: 1 }],
    });

    const stranded = await withDb((db) =>
      db.select({ id: customers.id }).from(customers).where(eq(customers.name, name)),
    );
    expect(stranded).toEqual([]);
  });

  it("422s an empty items array", async () => {
    expect((await post("/orders", { channel: "dine_in", items: [] })).status).toBe(422);
  });

  it("422s a quantity below one", async () => {
    const item = await anyAvailableMenuItem();
    const response = await post("/orders", {
      channel: "dine_in",
      items: [{ menuItemId: item.id, quantity: 0 }],
    });
    expect(response.status).toBe(422);
  });

  it("keys the quantity error to its line", async () => {
    const item = await anyAvailableMenuItem();
    const body = await readJson<ApiErrorBody>(
      await post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 0 }],
      }),
    );
    expect(Object.keys(body.error.fields ?? {})).toContain("items.0.quantity");
  });

  it("422s an unknown channel", async () => {
    const item = await anyAvailableMenuItem();
    const response = await post("/orders", {
      channel: "carrier_pigeon",
      items: [{ menuItemId: item.id, quantity: 1 }],
    });
    expect(response.status).toBe(422);
  });

  it("accepts no prices in the payload", async () => {
    // A client-supplied price must not reach the order: the server prices it.
    const item = await anyAvailableMenuItem();
    const body = await readJson<OrderDetail>(
      await post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1, unitPriceCents: 1 }],
      }),
    );
    expect(body.totalCents).toBe(item.priceCents);
  });
});

describe("GET /orders/{id}", () => {
  it("returns the order just created", async () => {
    const item = await anyAvailableMenuItem();
    const created = await readJson<OrderDetail>(
      await post("/orders", { channel: "dine_in", items: [{ menuItemId: item.id, quantity: 1 }] }),
    );
    const fetched = await readJson<OrderDetail>(await get(`/orders/${created.id}`));
    expect(fetched.id).toBe(created.id);
  });

  it("404s an unknown id", async () => {
    expect((await get("/orders/0f8fad5b-d9cb-469f-a165-70867728950e")).status).toBe(404);
  });

  it("422s an id that is not a uuid", async () => {
    expect((await get("/orders/not-a-uuid")).status).toBe(422);
  });
});
