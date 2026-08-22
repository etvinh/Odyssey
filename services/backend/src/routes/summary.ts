import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { menuItems, orderItems, orders } from "../db/schema.js";
import { releaseDb, type Db } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { summaryWindows, type Window } from "../domain/summary-windows.js";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One day's trading. `revenueCents` counts completed orders only — a pending
 * order is not money taken, and a cancelled one never was.
 */
const DayFigures = z
  .object({ orderCount: z.number().int(), revenueCents: z.number().int() })
  .openapi("DayFigures");

const PopularItem = z
  .object({
    menuItemId: z.string().uuid(),
    name: z.string(),
    /** Orders in the window that contained this item, not covers sold. */
    orderCount: z.number().int(),
    /** orderCount over the window's total order count, as a fraction. */
    shareOfOrders: z.number(),
  })
  .openapi("PopularItem");

/**
 * Everything above the fold on Home, in one round trip — four separate reads
 * would be four spinners racing each other.
 *
 * There is deliberately no `pendingCount` here. Home's third KPI counts the
 * orders read it already runs for the needs-attention table, so the number has
 * one source and one invalidation. See planning/API.md §1.
 */
const Summary = z
  .object({
    today: DayFigures,
    yesterday: DayFigures,
    popularItems: z.array(PopularItem),
  })
  .openapi("Summary");

/** How many items the list shows. */
const POPULAR_ITEMS_LIMIT = 5;

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

const placedWithin = (window: Window) =>
  and(gte(orders.placedAt, window.from), lt(orders.placedAt, window.to));

async function dayFigures(db: Db, window: Window) {
  const [row] = await db
    .select({
      orderCount: sql<number>`count(*)`.mapWith(Number),
      revenueCents: sql<number>`coalesce(sum(
        case when ${orders.status} = 'completed' then ${orders.totalCents} else 0 end
      ), 0)`.mapWith(Number),
    })
    .from(orders)
    .where(placedWithin(window));

  return { orderCount: row?.orderCount ?? 0, revenueCents: row?.revenueCents ?? 0 };
}

async function popularItems(db: Db, window: Window) {
  const [totals] = await db
    .select({ orderCount: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .where(placedWithin(window));

  const windowOrders = totals?.orderCount ?? 0;
  if (windowOrders === 0) return [];

  /**
   * `count(distinct order_id)`, not `count(*)` or `sum(quantity)`: three of the
   * same dish on one ticket is still one order that contained it, and
   * shareOfOrders is a share of orders rather than of covers.
   *
   * Grouped by the snapshot name as well as the id so a renamed menu item still
   * reads as one row — the id is what identifies it, the name is what the list
   * shows, and order items carry the name as it was when the order was placed.
   */
  const rows = await db
    .select({
      menuItemId: orderItems.menuItemId,
      name: sql<string>`min(${menuItems.name})`,
      orderCount: sql<number>`count(distinct ${orderItems.orderId})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(placedWithin(window))
    .groupBy(orderItems.menuItemId)
    .orderBy(desc(sql`count(distinct ${orderItems.orderId})`))
    .limit(POPULAR_ITEMS_LIMIT);

  return rows.map((row) => ({
    menuItemId: row.menuItemId,
    name: row.name,
    orderCount: row.orderCount,
    shareOfOrders: row.orderCount / windowOrders,
  }));
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const getSummary = createRoute({
  method: "get",
  path: "/summary",
  operationId: "getSummary",
  tags: ["Summary"],
  responses: {
    200: {
      description: "The state of the day: today against yesterday, and what is selling.",
      content: { "application/json": { schema: Summary } },
    },
  },
});

export const summaryRoutes = new OpenAPIHono<AppEnv>().openapi(getSummary, async (c) => {
  const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

  try {
    // One `now` for all three windows, so a request crossing midnight cannot
    // compute today from one instant and yesterday from another.
    const windows = summaryWindows(new Date());

    const [today, yesterday, popular] = await Promise.all([
      dayFigures(db, windows.today),
      dayFigures(db, windows.yesterday),
      popularItems(db, windows.popular),
    ]);

    return c.json({ today, yesterday, popularItems: popular }, 200);
  } finally {
    await releaseDb(c, conn);
  }
});
