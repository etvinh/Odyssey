import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { asc, desc, eq, ilike, sql } from "drizzle-orm";
import { customers, orders } from "../db/schema.js";
import { releaseDb } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { listEnvelope } from "../schemas/envelope.js";
import { errorResponse } from "../schemas/error.js";
import { pageWindow } from "../domain/pagination.js";

/**
 * Derived totals are computed per read, never stored — a stored counter is a
 * counter that drifts from the rows it summarises.
 */
const Customer = createSelectSchema(customers)
  .pick({ id: true, name: true, phone: true, email: true })
  .extend({
    orderCount: z.number().int(),
    totalSpendCents: z.number().int(),
    lastOrderAt: z.string().nullable(),
  })
  .openapi("Customer");

const listCustomers = createRoute({
  method: "get",
  path: "/customers",
  operationId: "listCustomers",
  tags: ["Customers"],
  request: {
    query: z.object({
      search: z.string().min(1).optional(),
      sort: z.enum(["totalSpendCents.desc", "name.asc"]).default("totalSpendCents.desc"),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
    }),
  },
  responses: {
    200: {
      description: "Customers with their derived totals, biggest spenders first.",
      content: { "application/json": { schema: listEnvelope(Customer, "CustomerList") } },
    },
    422: errorResponse("The query parameters did not validate."),
  },
});

export const customerRoutes = new OpenAPIHono<AppEnv>().openapi(listCustomers, async (c) => {
  const { search, sort, page, pageSize } = c.req.valid("query");
  const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

  try {
    const filter = search ? ilike(customers.name, `%${search}%`) : undefined;

    /**
     * One grouped query rather than a lookup per row: N+1 here would be 25
     * round trips to render one table.
     *
     * Spend excludes cancelled orders — money was never taken — while the count
     * and the last visit include them, because the customer did place the order.
     */
    const spend = sql<number>`coalesce(sum(
      case when ${orders.status} <> 'cancelled' then ${orders.totalCents} else 0 end
    ), 0)`.mapWith(Number);

    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
        totalSpendCents: spend,
        lastOrderAt: sql<Date | null>`max(${orders.placedAt})`,
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(filter)
      .groupBy(customers.id, customers.name, customers.phone, customers.email)
      .orderBy(sort === "name.asc" ? asc(customers.name) : desc(spend), asc(customers.name))
      .limit(pageWindow(page, pageSize).limit)
      .offset(pageWindow(page, pageSize).offset);

    // Counted separately so it survives a page past the end.
    const [counted] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(customers)
      .where(filter);

    const data = rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      orderCount: row.orderCount,
      totalSpendCents: row.totalSpendCents,
      lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
    }));

    return c.json({ data, meta: { total: counted?.value ?? 0, page, pageSize } }, 200);
  } finally {
    await releaseDb(c, conn);
  }
});
