import { describe, expect, it } from "vitest";
import {
  readJson,
  withRolledBackApp,
  type ApiErrorBody,
  type ListEnvelope,
  type MenuItem,
} from "./setup.js";

type ItemList = ListEnvelope<MenuItem>;

describe("GET /menu/items", () => {
  it("returns the seeded items", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items"));
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  it("shapes every row to the contract", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items"));
      const shape = [
        "categoryId",
        "description",
        "id",
        "isAvailable",
        "name",
        "priceCents",
      ];
      expect(body.data.map((item) => Object.keys(item).toSorted())).toEqual(
        body.data.map(() => shape),
      );
    });
  });

  it("counts every returned row in meta.total", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items"));
      expect(body.meta.total).toBe(body.data.length);
    });
  });

  it("narrows to one category", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const categoryId = all.data[0]!.categoryId;
      const filtered = await readJson<ItemList>(
        await client.get(`/menu/items?categoryId=${categoryId}`),
      );
      expect(filtered.data.every((item) => item.categoryId === categoryId)).toBe(true);
    });
  });

  it("returns only orderable items when available=true", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items?available=true"));
      expect(body.data.every((item) => item.isAvailable)).toBe(true);
    });
  });

  it("still returns unavailable items by default", async () => {
    // The Menu page shows them; only the order picker filters.
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items"));
      expect(body.data.some((item) => !item.isAvailable)).toBe(true);
    });
  });

  it("finds an item by name", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items?search=Tiramisu"));
      expect(body.data.map((item) => item.name)).toContain("Tiramisu");
    });
  });

  it("returns nothing when the search matches nothing", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ItemList>(await client.get("/menu/items?search=zzzznomatch"));
      expect(body.data).toEqual([]);
    });
  });
});

describe("POST /menu/items", () => {
  it("responds 201", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.post("/menu/items", {
        categoryId: all.data[0]!.categoryId,
        name: "Salt-baked celeriac",
        description: "Black garlic, hazelnut",
        priceCents: 1750,
        isAvailable: true,
      });
      expect(response.status).toBe(201);
    });
  });

  it("returns the item it created", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const created = await readJson<MenuItem>(
        await client.post("/menu/items", {
          categoryId: all.data[0]!.categoryId,
          name: "Salt-baked celeriac",
          priceCents: 1750,
          isAvailable: true,
        }),
      );
      expect(created.priceCents).toBe(1750);
    });
  });

  it("makes the item appear in the list", async () => {
    // Exact-count assertions are safe here: nothing outside this transaction
    // can write into it.
    await withRolledBackApp(async (client) => {
      const before = await readJson<ItemList>(await client.get("/menu/items"));
      await client.post("/menu/items", {
        categoryId: before.data[0]!.categoryId,
        name: "Salt-baked celeriac",
        priceCents: 1750,
        isAvailable: true,
      });
      const after = await readJson<ItemList>(await client.get("/menu/items"));
      expect(after.meta.total).toBe(before.meta.total + 1);
    });
  });

  it("raises the holding category's itemCount", async () => {
    await withRolledBackApp(async (client) => {
      const items = await readJson<ItemList>(await client.get("/menu/items"));
      const categoryId = items.data[0]!.categoryId;
      const before = await readJson<ListEnvelope<{ id: string; itemCount: number }>>(
        await client.get("/menu/categories"),
      );
      await client.post("/menu/items", {
        categoryId,
        name: "Salt-baked celeriac",
        priceCents: 1750,
        isAvailable: true,
      });
      const after = await readJson<ListEnvelope<{ id: string; itemCount: number }>>(
        await client.get("/menu/categories"),
      );
      const was = before.data.find((c) => c.id === categoryId)!.itemCount;
      const now = after.data.find((c) => c.id === categoryId)!.itemCount;
      expect(now).toBe(was + 1);
    });
  });

  it("defaults a new item to available", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const created = await readJson<MenuItem>(
        await client.post("/menu/items", {
          categoryId: all.data[0]!.categoryId,
          name: "Salt-baked celeriac",
          priceCents: 1750,
        }),
      );
      expect(created.isAvailable).toBe(true);
    });
  });

  it("422s an empty name", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.post("/menu/items", {
        categoryId: all.data[0]!.categoryId,
        name: "",
        priceCents: 1750,
      });
      expect(response.status).toBe(422);
    });
  });

  it("422s a negative price", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.post("/menu/items", {
        categoryId: all.data[0]!.categoryId,
        name: "Salt-baked celeriac",
        priceCents: -1,
      });
      expect(response.status).toBe(422);
    });
  });

  it("keys the price error to its field", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const body = await readJson<ApiErrorBody>(
        await client.post("/menu/items", {
          categoryId: all.data[0]!.categoryId,
          name: "Salt-baked celeriac",
          priceCents: -1,
        }),
      );
      expect(Object.keys(body.error.fields ?? {})).toContain("priceCents");
    });
  });

  it("422s an unknown category", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.post("/menu/items", {
        categoryId: "0f8fad5b-d9cb-469f-a165-70867728950e",
        name: "Salt-baked celeriac",
        priceCents: 1750,
      });
      expect(response.status).toBe(422);
    });
  });

  it("names the category field when it is unknown", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<ApiErrorBody>(
        await client.post("/menu/items", {
          categoryId: "0f8fad5b-d9cb-469f-a165-70867728950e",
          name: "Salt-baked celeriac",
          priceCents: 1750,
        }),
      );
      expect(Object.keys(body.error.fields ?? {})).toContain("categoryId");
    });
  });
});

describe("PATCH /menu/items/{id}", () => {
  it("responds 200", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.patch(`/menu/items/${all.data[0]!.id}`, { priceCents: 999 });
      expect(response.status).toBe(200);
    });
  });

  it("changes only the field it was given", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const before = all.data[0]!;
      const after = await readJson<MenuItem>(
        await client.patch(`/menu/items/${before.id}`, { priceCents: 999 }),
      );
      expect(after).toEqual({ ...before, priceCents: 999 });
    });
  });

  it("toggles availability on its own", async () => {
    // What the row's Switch sends: just { isAvailable }.
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items?available=true"));
      const target = all.data[0]!;
      const after = await readJson<MenuItem>(
        await client.patch(`/menu/items/${target.id}`, { isAvailable: false }),
      );
      expect(after.isAvailable).toBe(false);
    });
  });

  it("drops a now-unavailable item from the picker's list", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items?available=true"));
      const target = all.data[0]!;
      await client.patch(`/menu/items/${target.id}`, { isAvailable: false });
      const after = await readJson<ItemList>(await client.get("/menu/items?available=true"));
      expect(after.data.map((item) => item.id)).not.toContain(target.id);
    });
  });

  it("moves an item to another category", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const target = all.data[0]!;
      const other = all.data.find((item) => item.categoryId !== target.categoryId)!;
      const after = await readJson<MenuItem>(
        await client.patch(`/menu/items/${target.id}`, { categoryId: other.categoryId }),
      );
      expect(after.categoryId).toBe(other.categoryId);
    });
  });

  it("404s an unknown item", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/menu/items/0f8fad5b-d9cb-469f-a165-70867728950e", {
        priceCents: 999,
      });
      expect(response.status).toBe(404);
    });
  });

  it("422s a negative price", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.patch(`/menu/items/${all.data[0]!.id}`, { priceCents: -1 });
      expect(response.status).toBe(422);
    });
  });

  it("422s a move to an unknown category", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.patch(`/menu/items/${all.data[0]!.id}`, {
        categoryId: "0f8fad5b-d9cb-469f-a165-70867728950e",
      });
      expect(response.status).toBe(422);
    });
  });

  it("leaves the item untouched when the body is empty", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const before = all.data[0]!;
      const after = await readJson<MenuItem>(await client.patch(`/menu/items/${before.id}`, {}));
      expect(after).toEqual(before);
    });
  });
});

describe("DELETE /menu/items/{id}", () => {
  it("responds 204", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const response = await client.del(`/menu/items/${all.data[0]!.id}`);
      expect(response.status).toBe(204);
    });
  });

  it("removes the item from every list read", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<ItemList>(await client.get("/menu/items"));
      const target = before.data[0]!;
      await client.del(`/menu/items/${target.id}`);
      const after = await readJson<ItemList>(await client.get("/menu/items"));
      expect(after.data.map((item) => item.id)).not.toContain(target.id);
    });
  });

  it("lowers the holding category's itemCount", async () => {
    await withRolledBackApp(async (client) => {
      const items = await readJson<ItemList>(await client.get("/menu/items"));
      const target = items.data[0]!;
      const before = await readJson<ListEnvelope<{ id: string; itemCount: number }>>(
        await client.get("/menu/categories"),
      );
      await client.del(`/menu/items/${target.id}`);
      const after = await readJson<ListEnvelope<{ id: string; itemCount: number }>>(
        await client.get("/menu/categories"),
      );
      const was = before.data.find((c) => c.id === target.categoryId)!.itemCount;
      const now = after.data.find((c) => c.id === target.categoryId)!.itemCount;
      expect(now).toBe(was - 1);
    });
  });

  it("leaves a past order intact", async () => {
    // The entire reason removal is soft. Removing an item from today's menu
    // must not touch last week's receipts.
    await withRolledBackApp(async (client) => {
      const orders = await readJson<{ data: { id: string }[] }>(
        await client.get("/orders?pageSize=1"),
      );
      const orderId = orders.data[0]!.id;
      const before = await readJson<{
        items: { menuItemId: string; name: string; lineTotalCents: number }[];
        totalCents: number;
      }>(await client.get(`/orders/${orderId}`));

      const line = before.items[0]!;
      const removal = await client.del(`/menu/items/${line.menuItemId}`);
      expect(removal.status).toBe(204);

      const after = await readJson<{
        items: { name: string; lineTotalCents: number }[];
        totalCents: number;
      }>(await client.get(`/orders/${orderId}`));

      expect(after.items.map((item) => item.name)).toContain(line.name);
    });
  });

  it("keeps the past order's total after the item is removed", async () => {
    await withRolledBackApp(async (client) => {
      const orders = await readJson<{ data: { id: string }[] }>(
        await client.get("/orders?pageSize=1"),
      );
      const orderId = orders.data[0]!.id;
      const before = await readJson<{ items: { menuItemId: string }[]; totalCents: number }>(
        await client.get(`/orders/${orderId}`),
      );
      await client.del(`/menu/items/${before.items[0]!.menuItemId}`);
      const after = await readJson<{ totalCents: number }>(await client.get(`/orders/${orderId}`));
      expect(after.totalCents).toBe(before.totalCents);
    });
  });

  it("404s an unknown item", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.del("/menu/items/0f8fad5b-d9cb-469f-a165-70867728950e");
      expect(response.status).toBe(404);
    });
  });

  it("404s an item that was already removed", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const target = all.data[0]!;
      await client.del(`/menu/items/${target.id}`);
      const again = await client.del(`/menu/items/${target.id}`);
      expect(again.status).toBe(404);
    });
  });

  it("404s an edit to a removed item", async () => {
    await withRolledBackApp(async (client) => {
      const all = await readJson<ItemList>(await client.get("/menu/items"));
      const target = all.data[0]!;
      await client.del(`/menu/items/${target.id}`);
      const response = await client.patch(`/menu/items/${target.id}`, { priceCents: 1 });
      expect(response.status).toBe(404);
    });
  });
});
