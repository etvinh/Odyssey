import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { type OrderAction, type OrderStatus } from "@odyssey/types";
import { customers, menuItems, orderEvents, orderItems, orders, settings } from "../db/schema.js";
import { releaseDb, type Db } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { listEnvelope } from "../schemas/envelope.js";
import {
  errorResponse,
  invalidTransition,
  itemUnavailable,
  notFound,
  validationFailed,
} from "../schemas/error.js";
import { allowedActions, nextStatus } from "../domain/order-actions.js";
import { orderRowColumns, toOrderRow } from "../domain/order-rows.js";
import { activeOrdersSince } from "../domain/order-window.js";
import { pageWindow } from "../domain/pagination.js";
import { OrderActionSchema, OrderRow, OrderStatusSchema } from "../schemas/order-row.js";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

/** The drawer can reach a customer, so the detail read carries a phone. */
const OrderDetailCustomer = z
  .object({ id: z.string().uuid(), name: z.string(), phone: z.string().nullable() })
  .openapi("OrderDetailCustomer");

const OrderItem = createSelectSchema(orderItems)
  .pick({
    id: true,
    menuItemId: true,
    name: true,
    unitPriceCents: true,
    quantity: true,
    lineTotalCents: true,
  })
  .openapi("OrderItem");

const OrderTimelineEntry = z
  .object({ status: OrderStatusSchema, changedAt: z.string() })
  .openapi("OrderTimelineEntry");

const OrderDetail = createSelectSchema(orders)
  .pick({ id: true, channel: true, status: true, totalCents: true, kitchenNote: true })
  .extend({
    orderNumber: z.string(),
    customer: OrderDetailCustomer.nullable(),
    items: z.array(OrderItem),
    timeline: z.array(OrderTimelineEntry),
    allowedActions: z.array(OrderActionSchema),
  })
  .openapi("OrderDetail");

const OrderList = listEnvelope(OrderRow, "OrderList");

/** Attach an existing customer. */
const OrderCustomerRef = z.object({ id: z.string().uuid() }).openapi("OrderCustomerRef");

/** Create one, inside the order's transaction. */
const OrderCustomerNew = z
  .object({
    name: z.string().min(1),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    preferences: z.array(z.string()).optional(),
  })
  .openapi("OrderCustomerNew");

const CreateOrderBody = z
  .object({
    /**
     * A union, not two optional fields: `{ id }` attaches, an object with a
     * `name` creates, and omitting the key entirely is a walk-in. Orval emits a
     * real union from this, so the frontend cannot construct a body with both.
     */
    customer: z.union([OrderCustomerRef, OrderCustomerNew]).optional(),
    channel: createSelectSchema(orders).shape.channel,
    kitchenNote: z.string().min(1).optional(),
    // No prices in the payload. Ever. The server snapshots them.
    items: z
      .array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1) }))
      .min(1),
  })
  .openapi("CreateOrderBody");

const OrderActionBody = z.object({ action: OrderActionSchema }).openapi("OrderActionBody");

const OrderIdParam = z.object({
  id: z
    .string()
    .uuid()
    .openapi({ param: { name: "id", in: "path" }, example: "0f8fad5b-d9cb-469f-a165-70867728950e" }),
});

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

type OrderDetailShape = z.infer<typeof OrderDetail>;

/**
 * The one place the detail shape is assembled. Create and the action endpoint
 * both return it too, so the drawer can render their responses without a
 * follow-up read.
 */
async function loadOrderDetail(db: Db, id: string): Promise<OrderDetailShape | undefined> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      channel: orders.channel,
      status: orders.status,
      totalCents: orders.totalCents,
      kitchenNote: orders.kitchenNote,
      customerId: customers.id,
      customerName: customers.name,
      customerPhone: customers.phone,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return undefined;

  const [items, timeline] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        menuItemId: orderItems.menuItemId,
        name: orderItems.name,
        unitPriceCents: orderItems.unitPriceCents,
        quantity: orderItems.quantity,
        lineTotalCents: orderItems.lineTotalCents,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      // No sort column on the line, so name keeps the drawer stable between reads.
      .orderBy(asc(orderItems.name)),
    db
      .select({ status: orderEvents.status, changedAt: orderEvents.changedAt })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, id))
      .orderBy(asc(orderEvents.changedAt)),
  ]);

  return {
    id: order.id,
    orderNumber: String(order.orderNumber),
    channel: order.channel,
    status: order.status,
    totalCents: order.totalCents,
    kitchenNote: order.kitchenNote,
    customer: order.customerId
      ? { id: order.customerId, name: order.customerName ?? "", phone: order.customerPhone }
      : null,
    items,
    timeline: timeline.map((event) => ({
      status: event.status,
      changedAt: event.changedAt.toISOString(),
    })),
    allowedActions: allowedActions(order.status),
  };
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const listOrders = createRoute({
  method: "get",
  path: "/orders",
  operationId: "listOrders",
  tags: ["Orders"],
  request: {
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
      sort: z.enum(["placedAt.desc", "placedAt.asc"]).default("placedAt.desc"),
    }),
  },
  responses: {
    200: {
      description: "Orders from the last 24 hours, newest first. Older orders are archived.",
      content: { "application/json": { schema: OrderList } },
    },
    422: errorResponse("The query parameters did not validate."),
  },
});

const getOrder = createRoute({
  method: "get",
  path: "/orders/{id}",
  operationId: "getOrder",
  tags: ["Orders"],
  request: { params: OrderIdParam },
  responses: {
    200: {
      description: "One order, with its items, timeline and allowed actions.",
      content: { "application/json": { schema: OrderDetail } },
    },
    404: errorResponse("No order with that id."),
    422: errorResponse("The id was not a uuid."),
  },
});

const createOrder = createRoute({
  method: "post",
  path: "/orders",
  operationId: "createOrder",
  tags: ["Orders"],
  request: {
    body: { content: { "application/json": { schema: CreateOrderBody } }, required: true },
  },
  responses: {
    201: {
      description: "The order as placed, priced by the server.",
      content: { "application/json": { schema: OrderDetail } },
    },
    409: errorResponse("A menu item on the order is unavailable or no longer on the menu."),
    422: errorResponse("The body did not validate."),
  },
});

const applyOrderAction = createRoute({
  method: "post",
  path: "/orders/{id}/actions",
  operationId: "applyOrderAction",
  tags: ["Orders"],
  request: {
    params: OrderIdParam,
    body: { content: { "application/json": { schema: OrderActionBody } }, required: true },
  },
  responses: {
    200: {
      description: "The order after the action, with a fresh timeline and allowed actions.",
      content: { "application/json": { schema: OrderDetail } },
    },
    404: errorResponse("No order with that id."),
    409: errorResponse("That action is not legal from the order's current status."),
    422: errorResponse("The body did not validate."),
  },
});

export const orderRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listOrders, async (c) => {
    const { page, pageSize, sort } = c.req.valid("query");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const window = pageWindow(page, pageSize);

      /**
       * The live window. Older orders are archived — still readable by id and
       * still counted everywhere they are summed, but out of the working list.
       * One `since` for both queries, so the page and its total cannot be
       * computed from two different instants.
       */
      const since = activeOrdersSince(new Date());
      const live = gte(orders.placedAt, since);

      const rows = await db
        .select(orderRowColumns)
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(live)
        .orderBy(sort === "placedAt.asc" ? asc(orders.placedAt) : desc(orders.placedAt))
        .limit(window.limit)
        .offset(window.offset);

      const [counted] = await db
        .select({ total: sql<number>`count(*)`.mapWith(Number) })
        .from(orders)
        .where(live);

      const data = rows.map(toOrderRow);

      /**
       * The total is counted independently of paging, never read off the
       * returned rows: a page past the end has no rows to read a windowed count
       * off, and reporting zero there strands the pagination footer.
       */
      return c.json({ data, meta: { total: counted?.total ?? 0, page, pageSize } }, 200);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(getOrder, async (c) => {
    const { id } = c.req.valid("param");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const order = await loadOrderDetail(db, id);
      if (!order) throw notFound(`No order with id ${id}.`);
      return c.json(order, 200);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(createOrder, async (c) => {
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      const orderId = await db.transaction(async (tx) => {
        const [config] = await tx
          .select({ isAutoAccepting: settings.isAutoAccepting })
          .from(settings)
          .limit(1);

        // Fetched without the deleted filter so a rejection can name the item.
        const requestedIds = [...new Set(body.items.map((item) => item.menuItemId))];
        const found = await tx
          .select({
            id: menuItems.id,
            name: menuItems.name,
            priceCents: menuItems.priceCents,
            isAvailable: menuItems.isAvailable,
            deletedAt: menuItems.deletedAt,
          })
          .from(menuItems)
          .where(inArray(menuItems.id, requestedIds));

        const byId = new Map(found.map((item) => [item.id, item]));

        for (const [index, line] of body.items.entries()) {
          const item = byId.get(line.menuItemId);
          if (!item) {
            throw validationFailed("That menu item does not exist.", {
              [`items.${index}.menuItemId`]: "No menu item with that id.",
            });
          }
          if (item.deletedAt) {
            throw itemUnavailable(`${item.name} is no longer on the menu.`);
          }
          if (!item.isAvailable) {
            throw itemUnavailable(`${item.name} is unavailable right now.`);
          }
        }

        let customerId: string | null = null;
        if (body.customer && "id" in body.customer) {
          const [existing] = await tx
            .select({ id: customers.id })
            .from(customers)
            .where(eq(customers.id, body.customer.id))
            .limit(1);
          if (!existing) {
            throw validationFailed("That customer does not exist.", {
              "customer.id": "No customer with that id.",
            });
          }
          customerId = existing.id;
        } else if (body.customer) {
          // Inserted here, inside the order's transaction, so a rejected order
          // can never leave behind a customer with no orders.
          const [created] = await tx
            .insert(customers)
            .values({
              name: body.customer.name,
              phone: body.customer.phone ?? null,
              email: body.customer.email ?? null,
              preferences: body.customer.preferences ?? [],
            })
            .returning({ id: customers.id });
          customerId = created?.id ?? null;
        }

        const lines = body.items.map((line) => {
          // Non-null: every id was checked against `byId` above.
          const item = byId.get(line.menuItemId)!;
          return {
            menuItemId: item.id,
            // Snapshots, not joins. Renaming this item next month must not
            // rewrite this receipt.
            name: item.name,
            unitPriceCents: item.priceCents,
            quantity: line.quantity,
            lineTotalCents: item.priceCents * line.quantity,
          };
        });

        const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
        // Auto-accept means the order arrives already confirmed rather than
        // waiting for the manager to accept it.
        const initialStatus: OrderStatus = config?.isAutoAccepting ? "confirmed" : "pending";

        const [created] = await tx
          .insert(orders)
          .values({
            customerId,
            channel: body.channel,
            status: initialStatus,
            kitchenNote: body.kitchenNote ?? null,
            totalCents,
          })
          .returning({ id: orders.id });

        if (!created) throw new Error("Order insert returned no row.");

        await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: created.id })));
        await tx.insert(orderEvents).values({ orderId: created.id, status: initialStatus });

        return created.id;
      });

      const order = await loadOrderDetail(db, orderId);
      if (!order) throw new Error(`Order ${orderId} vanished immediately after creation.`);
      return c.json(order, 201);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(applyOrderAction, async (c) => {
    const { id } = c.req.valid("param");
    const { action } = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      await db.transaction(async (tx) => {
        const [order] = await tx
          .select({ status: orders.status })
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);

        if (!order) throw notFound(`No order with id ${id}.`);

        const next = nextStatus(order.status, action);
        if (!next) {
          throw invalidTransition(
            `Cannot ${describe(action)} an order that is ${order.status}.`,
          );
        }

        /**
         * Compare-and-swap on the status we read. If another request moved the
         * order in between, no row matches and we reject rather than writing a
         * transition from a status the order has already left.
         */
        const moved = await tx
          .update(orders)
          .set({ status: next, updatedAt: new Date() })
          .where(and(eq(orders.id, id), eq(orders.status, order.status)))
          .returning({ id: orders.id });

        if (moved.length === 0) {
          throw invalidTransition("The order changed status while this action was in flight.");
        }

        await tx.insert(orderEvents).values({ orderId: id, status: next });
      });

      const order = await loadOrderDetail(db, id);
      if (!order) throw notFound(`No order with id ${id}.`);
      return c.json(order, 200);
    } finally {
      await releaseDb(c, conn);
    }
  });

/** Turns an action into something that reads in an error sentence. */
function describe(action: OrderAction): string {
  return action.replace(/_/g, " ");
}
