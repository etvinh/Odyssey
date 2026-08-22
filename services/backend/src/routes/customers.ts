import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { asc, desc, eq, ilike, sql } from "drizzle-orm";
import { customers, orders } from "../db/schema.js";
import { releaseDb, type Db } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { listEnvelope } from "../schemas/envelope.js";
import { errorResponse, notFound } from "../schemas/error.js";
import { orderRowColumns, toOrderRow } from "../domain/order-rows.js";
import { OrderRow } from "../schemas/order-row.js";
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

/**
 * The list row widened with what only the drawer needs.
 *
 * `recentOrders` is the `GET /orders` row verbatim, so tapping one opens the
 * real order through the already-cached `useGetOrder` rather than a second
 * renderer for a near-identical shape.
 *
 * `preferences` is read-only in this build: there is no PATCH, so the drawer
 * presents it as display rather than an editable field.
 */
const CustomerDetail = Customer.extend({
  preferences: z.array(z.string()),
  recentOrders: z.array(OrderRow),
}).openapi("CustomerDetail");

/** How many of a customer's orders the drawer shows. */
const RECENT_ORDER_LIMIT = 10;

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

const getCustomer = createRoute({
  method: "get",
  path: "/customers/{id}",
  operationId: "getCustomer",
  tags: ["Customers"],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: { name: "id", in: "path" },
        example: "0f8fad5b-d9cb-469f-a165-70867728950e",
      }),
    }),
  },
  responses: {
    200: {
      description: "One customer, with their preferences and recent orders.",
      content: { "application/json": { schema: CustomerDetail } },
    },
    404: errorResponse("No customer with that id."),
    422: errorResponse("The id was not a uuid."),
  },
});

/**
 * Spend excludes cancelled orders — money was never taken — while the count and
 * the last visit include them, because the customer did place the order. Held
 * here so the list and the detail read cannot drift apart on that rule.
 */
const spendCents = sql<number>`coalesce(sum(
  case when ${orders.status} <> 'cancelled' then ${orders.totalCents} else 0 end
), 0)`.mapWith(Number);

const derivedTotals = {
  orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
  totalSpendCents: spendCents,
  lastOrderAt: sql<Date | null>`max(${orders.placedAt})`,
};

async function loadCustomerDetail(db: Db, id: string) {
  const [row] = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      preferences: customers.preferences,
      ...derivedTotals,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(eq(customers.id, id))
    .groupBy(customers.id, customers.name, customers.phone, customers.email, customers.preferences)
    .limit(1);

  if (!row) return undefined;

  const recent = await db
    .select(orderRowColumns)
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.placedAt))
    .limit(RECENT_ORDER_LIMIT);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    preferences: row.preferences,
    orderCount: row.orderCount,
    totalSpendCents: row.totalSpendCents,
    lastOrderAt: row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null,
    recentOrders: recent.map(toOrderRow),
  };
}

export const customerRoutes = new OpenAPIHono<AppEnv>().openapi(listCustomers, async (c) => {
  const { search, sort, page, pageSize } = c.req.valid("query");
  const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

  try {
    const filter = search ? ilike(customers.name, `%${search}%`) : undefined;

    /**
     * One grouped query rather than a lookup per row: N+1 here would be 25
     * round trips to render one table.
     */
    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        ...derivedTotals,
      })
      .from(customers)
      .leftJoin(orders, eq(orders.customerId, customers.id))
      .where(filter)
      .groupBy(customers.id, customers.name, customers.phone, customers.email)
      .orderBy(sort === "name.asc" ? asc(customers.name) : desc(spendCents), asc(customers.name))
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
}).openapi(getCustomer, async (c) => {
  const { id } = c.req.valid("param");
  const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

  try {
    const customer = await loadCustomerDetail(db, id);
    if (!customer) throw notFound(`No customer with id ${id}.`);
    return c.json(customer, 200);
  } finally {
    await releaseDb(c, conn);
  }
});
