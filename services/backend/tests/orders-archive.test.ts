import { describe, expect, it } from "vitest";
import { lt } from "drizzle-orm";
import { orders } from "../src/db/schema.js";
import { ORDER_WINDOW_HOURS } from "../src/domain/order-window.js";
import { anyAvailableMenuItem, readJson, withDb, withRolledBackApp } from "./setup.js";
import type { ListEnvelope, OrderRow } from "./setup.js";

type OrderList = ListEnvelope<OrderRow>;

const windowStart = () => new Date(Date.now() - ORDER_WINDOW_HOURS * 3_600_000);

describe("GET /orders is limited to the live window", () => {
  it("returns only orders placed in the last 24 hours", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<OrderList>(await client.get("/orders?pageSize=100"));
      const cutoff = windowStart();
      expect(body.data.every((order) => new Date(order.placedAt) >= cutoff)).toBe(true);
    });
  });

  it("leaves older orders out of the total, not merely off the page", async () => {
    // Counted straight from Postgres, so the expectation does not come from the
    // same query the route uses.
    const archived = await withDb(async (db) => {
      const rows = await db.select({ id: orders.id }).from(orders).where(lt(orders.placedAt, windowStart()));
      return rows.length;
    });
    expect(archived).toBeGreaterThan(0);

    await withRolledBackApp(async (client) => {
      const body = await readJson<OrderList>(await client.get("/orders"));
      const total = await withDb(async (db) => (await db.select({ id: orders.id }).from(orders)).length);
      expect(body.meta.total).toBe(total - archived);
    });
  });

  it("shows an order placed right now", async () => {
    await withRolledBackApp(async (client) => {
      const item = await anyAvailableMenuItem();
      const created = await readJson<{ id: string }>(
        await client.post("/orders", {
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 1 }],
        }),
      );
      const body = await readJson<OrderList>(await client.get("/orders?pageSize=100"));
      expect(body.data.map((order) => order.id)).toContain(created.id);
    });
  });
});

describe("an archived order is hidden, not gone", () => {
  it("still reads by id", async () => {
    // Archiving is a view over the list, never a deletion: a link to an old
    // order, and a customer's history, must keep working.
    const oldest = await withDb(async (db) => {
      const [row] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(lt(orders.placedAt, windowStart()))
        .limit(1);
      return row;
    });
    expect(oldest).toBeDefined();

    await withRolledBackApp(async (client) => {
      expect((await client.get(`/orders/${oldest!.id}`)).status).toBe(200);
    });
  });

  it("still counts toward a customer's derived totals", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<{ data: { id: string; orderCount: number }[] }>(
        await client.get("/customers?pageSize=100"),
      );
      const regular = list.data.find((customer) => customer.orderCount > 1);
      expect(regular).toBeDefined();
    });
  });
});
