import {
  pgTable,
  pgEnum,
  pgSequence,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ORDER_CHANNELS, ORDER_STATUSES } from "@odyssey/types";

/**
 * Every table in Odyssey. One flat file: the schema is the source of truth for
 * the whole contract, and splitting it hides the relationships.
 *
 * Enum *values* come from @odyssey/types so the dashboard and the Worker cannot
 * disagree about them — see ADR-0004 and the note in that package.
 */

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const orderChannelEnum = pgEnum("order_channel", ORDER_CHANNELS);

/**
 * Order numbers are human-facing and start at 1000, so the first order is
 * #1000 rather than #1 — a restaurant that has taken four orders ever should
 * not advertise it on the ticket.
 */
export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1000 });

export const menuCategories = pgTable(
  "menu_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("menu_categories_name_key").on(t.name)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      // RESTRICT, so a category holding items cannot be deleted out from under
      // them. That is what CATEGORY_NOT_EMPTY reports.
      .references(() => menuCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    /**
     * Soft delete. order_items references this table with RESTRICT, so a hard
     * delete would either fail or orphan history. Every list read filters
     * `deleted_at IS NULL`; the rows survive so past orders stay intact.
     *
     * Not the same thing as `is_available`: unavailable is temporary and
     * reversible, deleted is neither.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("menu_items_category_id_idx").on(t.categoryId),
    index("menu_items_live_idx").on(t.categoryId).where(sql`${t.deletedAt} is null`),
    check("menu_items_price_cents_check", sql`${t.priceCents} >= 0`),
  ],
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    /**
     * Free text a restaurant keeps about someone — a favourite table, an
     * allergy. An array rather than a join table because it is deliberately
     * unstructured: it is not a taxonomy and never gets one.
     */
    preferences: text("preferences").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // No unique constraint on phone or email on purpose: a restaurant genuinely
  // has two customers with the same name and no contact details, and rejecting
  // that at the database is worse than allowing it.
  (t) => [index("customers_name_idx").on(sql`lower(${t.name})`)],
);

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    isAcceptingOrders: boolean("is_accepting_orders").notNull().default(true),
    isAutoAccepting: boolean("is_auto_accepting").notNull().default(false),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(20),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // What makes this a singleton at the database level rather than by
    // convention. There is exactly one settings row, forever.
    check("settings_singleton_check", sql`${t.id} = 1`),
    check("settings_prep_time_check", sql`${t.prepTimeMinutes} between 5 and 120`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The human-facing identifier, distinct from `id`. Stored as an integer and
     * serialised to a string at the API edge, because it is something to read
     * off a ticket rather than a number to do arithmetic on.
     */
    orderNumber: integer("order_number")
      .notNull()
      .default(sql`nextval('order_number_seq')`),
    /** Null is a walk-in — an ordinary case, not missing data. */
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "restrict" }),
    channel: orderChannelEnum("channel").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    kitchenNote: text("kitchen_note"),
    totalCents: integer("total_cents").notNull(),
    /**
     * The domain timestamp, which doubles as the creation timestamp. There is
     * deliberately no separate `created_at`: two columns holding the same
     * instant is a lie waiting to diverge.
     */
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_order_number_key").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_placed_at_idx").on(t.placedAt.desc()),
    index("orders_customer_id_idx").on(t.customerId),
    check("orders_total_cents_check", sql`${t.totalCents} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "restrict" }),
    /**
     * `name` and `unit_price_cents` are snapshots, not joins. This is the whole
     * reason menu items soft-delete, and the reason renaming a menu item next
     * month does not rewrite last week's receipts.
     */
    name: text("name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    /**
     * Stored rather than computed, so a historical line can never be
     * re-derived from changed inputs. Equals unitPriceCents * quantity at write
     * time and is never recalculated.
     */
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_menu_item_id_idx").on(t.menuItemId),
    check("order_items_unit_price_cents_check", sql`${t.unitPriceCents} >= 0`),
    check("order_items_quantity_check", sql`${t.quantity} >= 1`),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** The status the order moved *into*. */
    status: orderStatusEnum("status").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Append-only: no updates, no deletes. Creating an order writes the first
  // row; every accepted action writes one more. Records that a status changed,
  // not who changed it — there are no user accounts in this build.
  (t) => [index("order_events_order_id_changed_at_idx").on(t.orderId, t.changedAt)],
);
