import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { menuCategories, menuItems } from "../db/schema.js";
import { releaseDb } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { listEnvelope } from "../schemas/envelope.js";

/** Shape derived from the Drizzle table — not hand-written. */
const MenuCategory = createSelectSchema(menuCategories)
  .pick({ id: true, name: true, sortOrder: true })
  .extend({ itemCount: z.number().int() })
  .openapi("MenuCategory");

const listMenuCategories = createRoute({
  method: "get",
  path: "/menu/categories",
  operationId: "listMenuCategories",
  tags: ["Menu"],
  responses: {
    200: {
      description: "Every menu category, ordered for display.",
      content: { "application/json": { schema: listEnvelope(MenuCategory, "MenuCategoryList") } },
    },
  },
});

export const menuRoutes = new OpenAPIHono<AppEnv>().openapi(
  listMenuCategories,
  async (c) => {
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);
    try {
      // itemCount is derived, never stored, and counts only what can still be
      // ordered — a removed item leaves the count while its row survives so
      // past orders stay intact.
      const data = await db
        .select({
          id: menuCategories.id,
          name: menuCategories.name,
          sortOrder: menuCategories.sortOrder,
          itemCount: sql<number>`(
            select count(*) from ${menuItems}
            where ${eq(menuItems.categoryId, menuCategories.id)}
              and ${isNull(menuItems.deletedAt)}
          )`.mapWith(Number),
        })
        .from(menuCategories)
        .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));

      return c.json(
        { data, meta: { total: data.length, page: 1, pageSize: data.length } },
        200,
      );
    } finally {
      await releaseDb(c, conn);
    }
  },
);
