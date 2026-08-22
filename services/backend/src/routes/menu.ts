import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { asc } from "drizzle-orm";
import { menuCategories } from "../db/schema.js";
import { createDb } from "../db/client.js";
import type { Env } from "../env.js";
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

export const menuRoutes = new OpenAPIHono<{ Bindings: Env }>().openapi(
  listMenuCategories,
  async (c) => {
    const { db, sql } = createDb(c.env.DATABASE_URL);
    try {
      const rows = await db
        .select({
          id: menuCategories.id,
          name: menuCategories.name,
          sortOrder: menuCategories.sortOrder,
        })
        .from(menuCategories)
        .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));

      // itemCount is derived, never stored — menu_items lands in Stage 1.
      const data = rows.map((r) => ({
        id: r.id,
        name: r.name,
        sortOrder: r.sortOrder,
        itemCount: 0,
      }));

      return c.json(
        { data, meta: { total: data.length, page: 1, pageSize: data.length } },
        200,
      );
    } finally {
      // Hono's executionCtx getter throws when the app is invoked without
      // one (app.request with no ctx, a Node adapter), which would turn a
      // good response into a 500 and mask the real error.
      const close = sql.end();
      try {
        c.executionCtx.waitUntil(close);
      } catch {
        await close;
      }
    }
  },
);
