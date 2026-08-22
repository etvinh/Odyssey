import { describe, expect, it } from "vitest";
import { anyAvailableMenuItem, readJson, withRolledBackApp } from "./setup.js";

type Summary = {
  today: { orderCount: number; revenueCents: number };
  yesterday: { orderCount: number; revenueCents: number };
  popularItems: {
    menuItemId: string;
    name: string;
    orderCount: number;
    shareOfOrders: number;
  }[];
};

describe("GET /summary", () => {
  it("responds 200", async () => {
    await withRolledBackApp(async (client) => {
      expect((await client.get("/summary")).status).toBe(200);
    });
  });

  it("returns the three sections Home reads", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect(Object.keys(body).toSorted()).toEqual(["popularItems", "today", "yesterday"]);
    });
  });

  it("carries a count and a revenue figure for each day", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect(Object.keys(body.today).toSorted()).toEqual(["orderCount", "revenueCents"]);
      expect(Object.keys(body.yesterday).toSorted()).toEqual(["orderCount", "revenueCents"]);
    });
  });

  it("serves no pendingCount, which the orders read already owns", async () => {
    // API.md: a count served by two endpoints is a count that can disagree
    // with itself mid-render.
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect("pendingCount" in body).toBe(false);
    });
  });

  it("counts a new order into today", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Summary>(await client.get("/summary"));
      const item = await anyAvailableMenuItem();
      await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      });
      const after = await readJson<Summary>(await client.get("/summary"));
      expect(after.today.orderCount).toBe(before.today.orderCount + 1);
    });
  });

  it("leaves revenue alone until the order completes", async () => {
    // Revenue is completed orders only: a pending order is not money taken.
    await withRolledBackApp(async (client) => {
      const before = await readJson<Summary>(await client.get("/summary"));
      const item = await anyAvailableMenuItem();
      await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 2 }],
      });
      const after = await readJson<Summary>(await client.get("/summary"));
      expect(after.today.revenueCents).toBe(before.today.revenueCents);
    });
  });

  it("adds the order's total to revenue once it completes", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Summary>(await client.get("/summary"));
      const item = await anyAvailableMenuItem();
      const created = await readJson<{ id: string; totalCents: number }>(
        await client.post("/orders", {
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 2 }],
        }),
      );
      for (const action of ["confirm", "start_preparing", "mark_ready", "complete"]) {
        await client.post(`/orders/${created.id}/actions`, { action });
      }
      const after = await readJson<Summary>(await client.get("/summary"));
      expect(after.today.revenueCents).toBe(before.today.revenueCents + created.totalCents);
    });
  });

  it("does not count a cancelled order as revenue", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Summary>(await client.get("/summary"));
      const item = await anyAvailableMenuItem();
      const created = await readJson<{ id: string }>(
        await client.post("/orders", {
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 1 }],
        }),
      );
      await client.post(`/orders/${created.id}/actions`, { action: "cancel" });
      const after = await readJson<Summary>(await client.get("/summary"));
      expect(after.today.revenueCents).toBe(before.today.revenueCents);
    });
  });

  it("leaves yesterday untouched when an order lands today", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Summary>(await client.get("/summary"));
      const item = await anyAvailableMenuItem();
      await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      });
      const after = await readJson<Summary>(await client.get("/summary"));
      expect(after.yesterday).toEqual(before.yesterday);
    });
  });

  it("returns at most five popular items", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect(body.popularItems.length).toBeLessThanOrEqual(5);
    });
  });

  it("orders popular items by how many orders contained them", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      const counts = body.popularItems.map((item) => item.orderCount);
      expect(counts).toEqual(counts.toSorted((a, b) => b - a));
    });
  });

  it("expresses share as a fraction between zero and one", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect(
        body.popularItems.every((item) => item.shareOfOrders > 0 && item.shareOfOrders <= 1),
      ).toBe(true);
    });
  });

  it("names each popular item, so the list needs no second read", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Summary>(await client.get("/summary"));
      expect(body.popularItems.every((item) => item.name.length > 0)).toBe(true);
    });
  });

  it("counts an order containing an item once, however many of it were ordered", async () => {
    // shareOfOrders is a share of ORDERS, not of covers: three of the same dish
    // on one ticket is still one order that contained it.
    await withRolledBackApp(async (client) => {
      const item = await anyAvailableMenuItem();
      const before = await readJson<Summary>(await client.get("/summary"));
      const countFor = (s: Summary) =>
        s.popularItems.find((row) => row.menuItemId === item.id)?.orderCount ?? 0;

      await client.post("/orders", {
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 3 }],
      });

      const after = await readJson<Summary>(await client.get("/summary"));
      expect(countFor(after)).toBe(countFor(before) + 1);
    });
  });
});
