import { describe, expect, it } from "vitest";
import {
  anyAvailableMenuItem,
  readJson,
  withRolledBackApp,
  type ListEnvelope,
  type OrderDetail,
} from "./setup.js";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  orderCount: number;
  totalSpendCents: number;
  lastOrderAt: string | null;
};

type CustomerList = ListEnvelope<Customer>;

describe("GET /customers", () => {
  it("returns the seeded customers", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<CustomerList>(await client.get("/customers"));
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  it("shapes every row to the contract", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<CustomerList>(await client.get("/customers"));
      const shape = [
        "email",
        "id",
        "lastOrderAt",
        "name",
        "orderCount",
        "phone",
        "totalSpendCents",
      ];
      expect(body.data.map((row) => Object.keys(row).toSorted())).toEqual(
        body.data.map(() => shape),
      );
    });
  });

  it("sorts by spend, highest first", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<CustomerList>(await client.get("/customers"));
      const spend = body.data.map((row) => row.totalSpendCents);
      expect(spend).toEqual(spend.toSorted((a, b) => b - a));
    });
  });

  it("counts a customer's orders", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<CustomerList>(await client.get("/customers"));
      expect(body.data.some((row) => row.orderCount > 0)).toBe(true);
    });
  });

  it("raises the order count when that customer places one", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<CustomerList>(await client.get("/customers"));
      const target = before.data[0]!;
      const item = await anyAvailableMenuItem();

      await client.post("/orders", {
        customer: { id: target.id },
        channel: "dine_in",
        items: [{ menuItemId: item.id, quantity: 1 }],
      });

      const after = await readJson<CustomerList>(await client.get("/customers"));
      const now = after.data.find((row) => row.id === target.id)!;
      expect(now.orderCount).toBe(target.orderCount + 1);
    });
  });

  it("adds the order's total to their spend", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<CustomerList>(await client.get("/customers"));
      const target = before.data[0]!;
      const item = await anyAvailableMenuItem();

      const order = await readJson<OrderDetail>(
        await client.post("/orders", {
          customer: { id: target.id },
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 2 }],
        }),
      );

      const after = await readJson<CustomerList>(await client.get("/customers"));
      const now = after.data.find((row) => row.id === target.id)!;
      expect(now.totalSpendCents).toBe(target.totalSpendCents + order.totalCents);
    });
  });

  it("leaves a cancelled order out of spend", async () => {
    // Money was never taken, so it is not spend — but they did place the order,
    // which is why the count below still moves.
    await withRolledBackApp(async (client) => {
      const before = await readJson<CustomerList>(await client.get("/customers"));
      const target = before.data[0]!;
      const item = await anyAvailableMenuItem();

      const order = await readJson<OrderDetail>(
        await client.post("/orders", {
          customer: { id: target.id },
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 1 }],
        }),
      );
      await client.post(`/orders/${order.id}/actions`, { action: "cancel" });

      const after = await readJson<CustomerList>(await client.get("/customers"));
      const now = after.data.find((row) => row.id === target.id)!;
      expect(now.totalSpendCents).toBe(target.totalSpendCents);
    });
  });

  it("still counts a cancelled order as one they placed", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<CustomerList>(await client.get("/customers"));
      const target = before.data[0]!;
      const item = await anyAvailableMenuItem();

      const order = await readJson<OrderDetail>(
        await client.post("/orders", {
          customer: { id: target.id },
          channel: "dine_in",
          items: [{ menuItemId: item.id, quantity: 1 }],
        }),
      );
      await client.post(`/orders/${order.id}/actions`, { action: "cancel" });

      const after = await readJson<CustomerList>(await client.get("/customers"));
      const now = after.data.find((row) => row.id === target.id)!;
      expect(now.orderCount).toBe(target.orderCount + 1);
    });
  });

  it("finds a customer by name", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<CustomerList>(await client.get("/customers"));
      const target = all.data.find((row) => row.name)!;
      const found = await readJson<CustomerList>(
        await client.get(`/customers?search=${encodeURIComponent(target.name)}`),
      );
      expect(found.data.map((row) => row.id)).toContain(target.id);
    });
  });

  it("returns nothing when the search matches nothing", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<CustomerList>(await client.get("/customers?search=zzzznomatch"));
      expect(body.data).toEqual([]);
    });
  });

  it("reports the total independently of the page", async () => {
    await withRolledBackApp(async (client) => {
      const first = await readJson<CustomerList>(await client.get("/customers?pageSize=5"));
      const pastEnd = await readJson<CustomerList>(await client.get("/customers?page=99&pageSize=5"));
      expect(pastEnd.meta.total).toBe(first.meta.total);
    });
  });

  it("creates a customer through the order flow", async () => {
    // There is no customer create endpoint; this is the only way one appears.
    await withRolledBackApp(async (client) => {
      const before = await readJson<CustomerList>(await client.get("/customers"));
      const item = await anyAvailableMenuItem();

      await client.post("/orders", {
        customer: { name: "Inline Diner" },
        channel: "delivery",
        items: [{ menuItemId: item.id, quantity: 1 }],
      });

      const after = await readJson<CustomerList>(await client.get("/customers"));
      expect(after.meta.total).toBe(before.meta.total + 1);
    });
  });
});
