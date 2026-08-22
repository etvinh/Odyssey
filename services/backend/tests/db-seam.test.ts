import { describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { anyAvailableMenuItem, readJson, withDb, withRolledBackApp, type OrderDetail } from "./setup.js";
import { orders } from "../src/db/schema.js";

/**
 * The seam that lets a test decide what sits behind the HTTP interface.
 *
 * Two adapters justify it: the real connection in the Worker, and a
 * transaction here that never commits. Without the seam a test can only cross
 * the HTTP interface and hope, which is why the suite runs with
 * fileParallelism disabled and avoids exact-count assertions.
 */

async function countOrders(): Promise<number> {
  const [row] = await withDb((db) => db.select({ value: count() }).from(orders));
  return row?.value ?? 0;
}

describe("an app given a transaction adapter", () => {
  it("serves a request through the injected handle", async () => {
    let status = 0;
    await withRolledBackApp(async (client) => {
      status = (await client.get("/orders?pageSize=1")).status;
    });
    expect(status).toBe(200);
  });

  it("places an order that the request itself can read back", async () => {
    let placed: OrderDetail | undefined;
    const item = await anyAvailableMenuItem();

    await withRolledBackApp(async (client) => {
      const response = await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 2 }],
      });
      placed = await readJson<OrderDetail>(response);
    });

    expect(placed?.totalCents).toBe(item.priceCents * 2);
  });

  it("leaves no order behind once the transaction rolls back", async () => {
    const before = await countOrders();
    const item = await anyAvailableMenuItem();

    await withRolledBackApp(async (client) => {
      await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      });
    });

    expect(await countOrders()).toBe(before);
  });

  it("leaves no status change behind once the transaction rolls back", async () => {
    const item = await anyAvailableMenuItem();
    let orderId = "";
    let statusInside = "";

    await withRolledBackApp(async (client) => {
      const created = await readJson<OrderDetail>(
        await client.post("/orders", {
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 1 }],
        }),
      );
      orderId = created.id;
      const moved = await readJson<OrderDetail>(
        await client.post(`/orders/${created.id}/actions`, { action: "confirm" }),
      );
      statusInside = moved.status;
    });

    expect(statusInside).toBe("confirmed");
    const [survivor] = await withDb((db) =>
      db.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)),
    );
    expect(survivor).toBeUndefined();
  });
});
