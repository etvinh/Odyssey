import { beforeAll, describe, expect, it } from "vitest";
import { get, readJson, withDb, type ListEnvelope, type MenuCategory } from "./setup.js";
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
