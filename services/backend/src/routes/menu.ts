import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { and, asc, count, eq, ilike, isNull, sql } from "drizzle-orm";
import { menuCategories, menuItems } from "../db/schema.js";
import { releaseDb, type Db } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { listEnvelope } from "../schemas/envelope.js";
import { ApiException, errorResponse, notFound, validationFailed } from "../schemas/error.js";

/** Shape derived from the Drizzle table — not hand-written. */
const MenuCategory = createSelectSchema(menuCategories)
  .pick({ id: true, name: true, sortOrder: true })
  .extend({ itemCount: z.number().int() })
  .openapi("MenuCategory");

/**
 * The wire shape of something a customer can order. `deletedAt` is absent on
 * purpose: a removed item vanishes from every read, so the field would always
 * be null here and would only invite a client to reason about removal.
 */
const MenuItem = createSelectSchema(menuItems)
  .pick({
    id: true,
    categoryId: true,
    name: true,
    description: true,
    priceCents: true,
    isAvailable: true,
  })
  .openapi("MenuItem");

const CreateMenuItemBody = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().min(1).optional(),
    priceCents: z.number().int().min(0),
    // Something new is orderable unless the restaurant says otherwise.
    isAvailable: z.boolean().default(true),
  })
  .openapi("CreateMenuItemBody");

/**
 * Every field optional: the row's availability Switch sends only isAvailable.
 *
 * `description` additionally accepts null, which clears it. The column is
 * nullable, so an item that has a description has to be able to lose one —
 * without this the edit form can add a description but never remove it. An
 * empty string stays invalid: absent, blank and cleared should not be three
 * ways of saying the same thing.
 */
const UpdateMenuItemBody = CreateMenuItemBody.partial()
  .extend({ description: z.string().min(1).nullish() })
  .openapi("UpdateMenuItemBody");

const MenuItemIdParam = z.object({
  id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }),
});

const CreateMenuCategoryBody = z
  .object({ name: z.string().min(1), sortOrder: z.number().int().optional() })
  .openapi("CreateMenuCategoryBody");

const UpdateMenuCategoryBody = CreateMenuCategoryBody.partial().openapi(
  "UpdateMenuCategoryBody",
);

const MenuCategoryIdParam = z.object({
  id: z.string().uuid().openapi({ param: { name: "id", in: "path" } }),
});

/** One row's worth of the category read, with its derived count. */
async function loadCategory(db: Db, id: string) {
  const [category] = await db
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
    .where(eq(menuCategories.id, id))
    .limit(1);
  return category;
}

/** The unique index on name is the guard; this turns it into the documented code. */
async function assertNameIsFree(db: Db, name: string, exceptId?: string) {
  const [clash] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.name, name))
    .limit(1);

  if (clash && clash.id !== exceptId) {
    throw new ApiException(409, "CATEGORY_NAME_TAKEN", `A category is already called ${name}.`);
  }
}

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

const listMenuItems = createRoute({
  method: "get",
  path: "/menu/items",
  operationId: "listMenuItems",
  tags: ["Menu"],
  request: {
    query: z.object({
      categoryId: z.string().uuid().optional(),
      /**
       * The order picker passes `true`. The filter is UX only — createOrder
       * re-checks availability, and the 409 is the actual guarantee.
       */
      available: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .optional(),
      search: z.string().min(1).optional(),
    }),
  },
  responses: {
    200: {
      description: "Every menu item that can still be ordered from.",
      content: { "application/json": { schema: listEnvelope(MenuItem, "MenuItemList") } },
    },
    422: errorResponse("The query parameters did not validate."),
  },
});

const createMenuItem = createRoute({
  method: "post",
  path: "/menu/items",
  operationId: "createMenuItem",
  tags: ["Menu"],
  request: {
    body: { content: { "application/json": { schema: CreateMenuItemBody } }, required: true },
  },
  responses: {
    201: {
      description: "The menu item as created.",
      content: { "application/json": { schema: MenuItem } },
    },
    422: errorResponse("The body did not validate, or the category does not exist."),
  },
});

const updateMenuItem = createRoute({
  method: "patch",
  path: "/menu/items/{id}",
  operationId: "updateMenuItem",
  tags: ["Menu"],
  request: {
    params: MenuItemIdParam,
    body: { content: { "application/json": { schema: UpdateMenuItemBody } }, required: true },
  },
  responses: {
    200: {
      description: "The menu item as it now stands.",
      content: { "application/json": { schema: MenuItem } },
    },
    404: errorResponse("No menu item with that id."),
    422: errorResponse("The body did not validate, or the category does not exist."),
  },
});

const deleteMenuItem = createRoute({
  method: "delete",
  path: "/menu/items/{id}",
  operationId: "deleteMenuItem",
  tags: ["Menu"],
  request: { params: MenuItemIdParam },
  responses: {
    204: { description: "The item was removed from the menu." },
    404: errorResponse("No menu item with that id."),
  },
});

const createMenuCategory = createRoute({
  method: "post",
  path: "/menu/categories",
  operationId: "createMenuCategory",
  tags: ["Menu"],
  request: {
    body: { content: { "application/json": { schema: CreateMenuCategoryBody } }, required: true },
  },
  responses: {
    201: {
      description: "The category as created, holding nothing yet.",
      content: { "application/json": { schema: MenuCategory } },
    },
    409: errorResponse("Another category already uses that name."),
    422: errorResponse("The body did not validate."),
  },
});

const updateMenuCategory = createRoute({
  method: "patch",
  path: "/menu/categories/{id}",
  operationId: "updateMenuCategory",
  tags: ["Menu"],
  request: {
    params: MenuCategoryIdParam,
    body: { content: { "application/json": { schema: UpdateMenuCategoryBody } }, required: true },
  },
  responses: {
    200: {
      description: "The category as it now stands.",
      content: { "application/json": { schema: MenuCategory } },
    },
    404: errorResponse("No category with that id."),
    409: errorResponse("Another category already uses that name."),
    422: errorResponse("The body did not validate."),
  },
});

const deleteMenuCategory = createRoute({
  method: "delete",
  path: "/menu/categories/{id}",
  operationId: "deleteMenuCategory",
  tags: ["Menu"],
  request: { params: MenuCategoryIdParam },
  responses: {
    204: { description: "The category was removed." },
    404: errorResponse("No category with that id."),
    409: errorResponse("The category still holds items."),
  },
});

export const menuRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listMenuItems, async (c) => {
    const { categoryId, available, search } = c.req.valid("query");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const data = await db
        .select({
          id: menuItems.id,
          categoryId: menuItems.categoryId,
          name: menuItems.name,
          description: menuItems.description,
          priceCents: menuItems.priceCents,
          isAvailable: menuItems.isAvailable,
        })
        .from(menuItems)
        // Removal is soft, so every read filters it out. The rows survive only
        // so past order items keep a valid reference.
        .where(
          and(
            isNull(menuItems.deletedAt),
            categoryId ? eq(menuItems.categoryId, categoryId) : undefined,
            available === undefined ? undefined : eq(menuItems.isAvailable, available),
            search ? ilike(menuItems.name, `%${search}%`) : undefined,
          ),
        )
        .orderBy(asc(menuItems.name));

      return c.json(
        { data, meta: { total: data.length, page: 1, pageSize: data.length } },
        200,
      );
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(createMenuItem, async (c) => {
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      // Checked here rather than left to the foreign key, so the client gets a
      // field error it can put under the category Select instead of a 500.
      const [category] = await db
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(eq(menuCategories.id, body.categoryId))
        .limit(1);

      if (!category) {
        throw validationFailed("That menu category does not exist.", {
          categoryId: "No menu category with that id.",
        });
      }

      const [created] = await db
        .insert(menuItems)
        .values({
          categoryId: body.categoryId,
          name: body.name,
          description: body.description ?? null,
          priceCents: body.priceCents,
          isAvailable: body.isAvailable,
        })
        .returning({
          id: menuItems.id,
          categoryId: menuItems.categoryId,
          name: menuItems.name,
          description: menuItems.description,
          priceCents: menuItems.priceCents,
          isAvailable: menuItems.isAvailable,
        });

      if (!created) throw new Error("Menu item insert returned no row.");
      return c.json(created, 201);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(updateMenuItem, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      if (body.categoryId) {
        const [category] = await db
          .select({ id: menuCategories.id })
          .from(menuCategories)
          .where(eq(menuCategories.id, body.categoryId))
          .limit(1);

        if (!category) {
          throw validationFailed("That menu category does not exist.", {
            categoryId: "No menu category with that id.",
          });
        }
      }

      const columns = {
        id: menuItems.id,
        categoryId: menuItems.categoryId,
        name: menuItems.name,
        description: menuItems.description,
        priceCents: menuItems.priceCents,
        isAvailable: menuItems.isAvailable,
      };

      // An empty body is a no-op rather than an error: the caller asked for
      // nothing to change, and drizzle rejects an update with no values.
      if (Object.keys(body).length === 0) {
        const [item] = await db
          .select(columns)
          .from(menuItems)
          .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)))
          .limit(1);

        if (!item) throw notFound(`No menu item with id ${id}.`);
        return c.json(item, 200);
      }

      const [updated] = await db
        .update(menuItems)
        .set({ ...body, updatedAt: new Date() })
        // A removed item is not editable — it is gone from every read.
        .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)))
        .returning(columns);

      if (!updated) throw notFound(`No menu item with id ${id}.`);
      return c.json(updated, 200);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(deleteMenuItem, async (c) => {
    const { id } = c.req.valid("param");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      /**
       * Soft: order items reference this row with RESTRICT, so a hard delete
       * would either fail or orphan history. Stamping deletedAt hides the item
       * from every read while last week's receipts keep a valid reference.
       */
      const [removed] = await db
        .update(menuItems)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(menuItems.id, id), isNull(menuItems.deletedAt)))
        .returning({ id: menuItems.id });

      if (!removed) throw notFound(`No menu item with id ${id}.`);
      return c.body(null, 204);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(createMenuCategory, async (c) => {
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      await assertNameIsFree(db, body.name);

      const [created] = await db
        .insert(menuCategories)
        .values({ name: body.name, ...(body.sortOrder === undefined ? {} : { sortOrder: body.sortOrder }) })
        .returning({ id: menuCategories.id });

      if (!created) throw new Error("Menu category insert returned no row.");
      return c.json(await loadCategory(db, created.id), 201);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(updateMenuCategory, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const existing = await loadCategory(db, id);
      if (!existing) throw notFound(`No menu category with id ${id}.`);

      if (body.name) await assertNameIsFree(db, body.name, id);

      if (Object.keys(body).length > 0) {
        await db
          .update(menuCategories)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(menuCategories.id, id));
      }

      return c.json(await loadCategory(db, id), 200);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(deleteMenuCategory, async (c) => {
    const { id } = c.req.valid("param");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const existing = await loadCategory(db, id);
      if (!existing) throw notFound(`No menu category with id ${id}.`);

      /**
       * Counts every referencing row, removed ones included — not just the
       * itemCount the read exposes. A removed item still points here so past
       * orders stay readable, and menu_items references categories with
       * RESTRICT, so deleting underneath one would fail in the database.
       */
      const [referencing] = await db
        .select({ value: count() })
        .from(menuItems)
        .where(eq(menuItems.categoryId, id));

      if ((referencing?.value ?? 0) > 0) {
        throw new ApiException(
          409,
          "CATEGORY_NOT_EMPTY",
          `${existing.name} still holds items. Move or remove them first.`,
        );
      }

      await db.delete(menuCategories).where(eq(menuCategories.id, id));
      return c.body(null, 204);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(listMenuCategories, async (c) => {
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
  });
