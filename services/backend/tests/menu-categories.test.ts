import { beforeAll, describe, expect, it } from "vitest";
import {
  get,
  readJson,
  withDb,
  withRolledBackApp,
  type ApiErrorBody,
  type ListEnvelope,
  type MenuCategory,
} from "./setup.js";
import { menuItems } from "../src/db/schema.js";
import { and, eq, isNull } from "drizzle-orm";

describe("GET /menu/categories", () => {
  let response: Response;
  let body: ListEnvelope<MenuCategory>;

  beforeAll(async () => {
    response = await get("/menu/categories");
    body = await readJson(response);
  });

  it("responds 200", () => {
    expect(response.status).toBe(200);
  });

  it("returns the seeded categories", () => {
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("orders them by sortOrder", () => {
    const positions = body.data.map((category) => category.sortOrder);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("counts the returned rows in meta.total", () => {
    expect(body.meta.total).toBe(body.data.length);
  });

  it("reports the first page", () => {
    expect(body.meta.page).toBe(1);
  });

  it("shapes every row to the contract", () => {
    expect(body.data).toEqual(
      body.data.map(() => ({
        id: expect.any(String),
        name: expect.any(String),
        sortOrder: expect.any(Number),
        itemCount: expect.any(Number),
      })),
    );
  });
});

describe("GET /menu/categories itemCount", () => {
  let body: ListEnvelope<MenuCategory>;

  beforeAll(async () => {
    body = await readJson(await get("/menu/categories"));
  });

  it("counts the items a category actually holds", () => {
    // The seed puts ~40 items across the categories, so a hard-coded zero
    // everywhere is the failure this exists to catch.
    expect(body.data.some((category) => category.itemCount > 0)).toBe(true);
  });

  it("reports zero for a category holding nothing", () => {
    // The seed keeps one category empty so the per-category empty state is
    // reachable.
    expect(body.data.some((category) => category.itemCount === 0)).toBe(true);
  });

  it("leaves a removed item out of the count", async () => {
    const target = body.data.find((category) => category.itemCount > 0)!;

    const [item] = await withDb((db) =>
      db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(and(eq(menuItems.categoryId, target.id), isNull(menuItems.deletedAt)))
        .limit(1),
    );

    try {
      await withDb((db) =>
        db
          .update(menuItems)
          .set({ deletedAt: new Date() })
          .where(eq(menuItems.id, item!.id)),
      );

      const after = await readJson<ListEnvelope<MenuCategory>>(await get("/menu/categories"));
      const counted = after.data.find((category) => category.id === target.id)!;
      expect(counted.itemCount).toBe(target.itemCount - 1);
    } finally {
      // Removal is soft, so the row is still there to put back.
      await withDb((db) =>
        db.update(menuItems).set({ deletedAt: null }).where(eq(menuItems.id, item!.id)),
      );
    }
  });
});

describe("POST /menu/categories", () => {
  it("responds 201", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.post("/menu/categories", { name: "Aperitivo" });
      expect(response.status).toBe(201);
    });
  });

  it("returns the category it created", async () => {
    await withRolledBackApp(async (client) => {
      const created = await readJson<MenuCategory>(
        await client.post("/menu/categories", { name: "Aperitivo" }),
      );
      expect(created.name).toBe("Aperitivo");
    });
  });

  it("starts a new category empty", async () => {
    await withRolledBackApp(async (client) => {
      const created = await readJson<MenuCategory>(
        await client.post("/menu/categories", { name: "Aperitivo" }),
      );
      expect(created.itemCount).toBe(0);
    });
  });

  it("makes it appear in the list", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      await client.post("/menu/categories", { name: "Aperitivo" });
      const after = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      expect(after.meta.total).toBe(before.meta.total + 1);
    });
  });

  it("422s an empty name", async () => {
    await withRolledBackApp(async (client) => {
      expect((await client.post("/menu/categories", { name: "" })).status).toBe(422);
    });
  });

  it("409s a name another category already uses", async () => {
    await withRolledBackApp(async (client) => {
      const existing = await readJson<ListEnvelope<MenuCategory>>(
        await client.get("/menu/categories"),
      );
      const response = await client.post("/menu/categories", { name: existing.data[0]!.name });
      expect(response.status).toBe(409);
    });
  });
});

describe("PATCH /menu/categories/{id}", () => {
  it("renames a category", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const renamed = await readJson<MenuCategory>(
        await client.patch(`/menu/categories/${list.data[0]!.id}`, { name: "Cicchetti" }),
      );
      expect(renamed.name).toBe("Cicchetti");
    });
  });

  it("reorders a category", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const moved = await readJson<MenuCategory>(
        await client.patch(`/menu/categories/${list.data[0]!.id}`, { sortOrder: 95 }),
      );
      expect(moved.sortOrder).toBe(95);
    });
  });

  it("keeps the item count while renaming", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const target = list.data.find((category) => category.itemCount > 0)!;
      const renamed = await readJson<MenuCategory>(
        await client.patch(`/menu/categories/${target.id}`, { name: "Cicchetti" }),
      );
      expect(renamed.itemCount).toBe(target.itemCount);
    });
  });

  it("404s an unknown category", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch(
        "/menu/categories/0f8fad5b-d9cb-469f-a165-70867728950e",
        { name: "Cicchetti" },
      );
      expect(response.status).toBe(404);
    });
  });

  it("409s a rename onto another category's name", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const response = await client.patch(`/menu/categories/${list.data[0]!.id}`, {
        name: list.data[1]!.name,
      });
      expect(response.status).toBe(409);
    });
  });
});

describe("DELETE /menu/categories/{id}", () => {
  it("removes a category holding nothing", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const empty = list.data.find((category) => category.itemCount === 0)!;
      expect((await client.del(`/menu/categories/${empty.id}`)).status).toBe(204);
    });
  });

  it("drops it from the list", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const empty = before.data.find((category) => category.itemCount === 0)!;
      await client.del(`/menu/categories/${empty.id}`);
      const after = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      expect(after.data.map((category) => category.id)).not.toContain(empty.id);
    });
  });

  it("409s a category that still holds items", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const holding = list.data.find((category) => category.itemCount > 0)!;
      expect((await client.del(`/menu/categories/${holding.id}`)).status).toBe(409);
    });
  });

  it("reports CATEGORY_NOT_EMPTY", async () => {
    await withRolledBackApp(async (client) => {
      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const holding = list.data.find((category) => category.itemCount > 0)!;
      const body = await readJson<ApiErrorBody>(await client.del(`/menu/categories/${holding.id}`));
      expect(body.error.code).toBe("CATEGORY_NOT_EMPTY");
    });
  });

  it("leaves the category in place after a refused removal", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      const holding = before.data.find((category) => category.itemCount > 0)!;
      await client.del(`/menu/categories/${holding.id}`);
      const after = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      expect(after.data.map((category) => category.id)).toContain(holding.id);
    });
  });

  it("still refuses when the category holds only removed items", async () => {
    // itemCount reads zero, but the rows still reference this category and
    // exist to keep past orders readable. Hard-deleting would break them.
    await withRolledBackApp(async (client) => {
      const created = await readJson<MenuCategory>(
        await client.post("/menu/categories", { name: "Aperitivo" }),
      );
      const item = await readJson<{ id: string }>(
        await client.post("/menu/items", {
          categoryId: created.id,
          name: "Negroni",
          priceCents: 1200,
        }),
      );
      await client.del(`/menu/items/${item.id}`);

      const list = await readJson<ListEnvelope<MenuCategory>>(await client.get("/menu/categories"));
      expect(list.data.find((category) => category.id === created.id)!.itemCount).toBe(0);
      expect((await client.del(`/menu/categories/${created.id}`)).status).toBe(409);
    });
  });

  it("404s an unknown category", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.del("/menu/categories/0f8fad5b-d9cb-469f-a165-70867728950e");
      expect(response.status).toBe(404);
    });
  });
});
