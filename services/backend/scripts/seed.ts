import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DAYS_OF_WEEK, ORDER_CHANNELS, type OrderStatus } from "@odyssey/types";
import {
  customers,
  menuCategories,
  menuItems,
  orderEvents,
  orderItems,
  orders,
  openingHours,
  settings,
} from "../src/db/schema.js";

/**
 * `pnpm seed`        truncates the seeded tables and repopulates them.
 * `pnpm seed:reset`  drops the schema and re-migrates first.
 *
 * Everything below is deterministic — a fixed PRNG seed, no Date.now() outside
 * a fixed reference point — so two reviewers running this see identical data
 * and a failing test means a real change rather than a different dice roll.
 */
const reset = process.argv.includes("--reset");

const url = process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";
/**
 * `onnotice` is silenced because the --reset path runs DROP SCHEMA ... CASCADE,
 * and postgres.js prints Postgres's "drop cascades to N other objects" NOTICE
 * as a bare object that reads exactly like a crash. The cascade is the point of
 * the command, so the notice is noise.
 */
const sql = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

/** mulberry32 — small, seedable, and good enough for fixture data. */
function makeRandom(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = makeRandom(20260822);

const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const CATEGORIES = [
  { name: "Small plates", sortOrder: 10 },
  { name: "Pasta", sortOrder: 20 },
  { name: "From the grill", sortOrder: 30 },
  { name: "Sides", sortOrder: 40 },
  { name: "Desserts", sortOrder: 50 },
  // Deliberately left empty, so the per-category empty state is reachable.
  { name: "Drinks", sortOrder: 60 },
];

/** name, priceCents, description. `isAvailable: false` on a handful below. */
const ITEMS: Record<string, [string, number, string | null][]> = {
  "Small plates": [
    ["Marinated olives", 650, "Castelvetrano, orange zest, thyme"],
    ["Whipped cod roe", 1100, "With sourdough crisps"],
    ["Burrata", 1450, "Heritage tomato, basil oil"],
    ["Padrón peppers", 850, "Sea salt, lemon"],
    ["Chicken liver parfait", 1250, "Madeira jelly, toasted brioche"],
    ["Crispy artichokes", 950, "Aioli"],
    ["Cured sea trout", 1350, "Fennel, dill, crème fraîche"],
    ["Pork croquetas", 1050, "Smoked paprika"],
  ],
  Pasta: [
    ["Cacio e pepe", 1650, "Pecorino, black pepper"],
    ["Tagliatelle ragù", 1950, "Eight-hour beef shin"],
    ["Wild mushroom rigatoni", 1850, "Garlic, parsley, aged parmesan"],
    ["Crab linguine", 2250, "Chilli, lemon, brown crab butter"],
    ["Pumpkin ravioli", 1750, "Brown butter, sage, amaretti"],
    ["Lasagne", 1850, "Beef and pork, béchamel"],
    ["Squid ink spaghetti", 2100, "Clams, white wine"],
  ],
  "From the grill": [
    ["Ribeye, 300g", 3400, "Dry-aged 35 days, bone marrow butter"],
    ["Half chicken", 2200, "Lemon, oregano, charred"],
    ["Lamb rump", 2800, "Anchovy, rosemary"],
    ["Whole sea bream", 2650, "Salsa verde"],
    ["Pork chop", 2400, "Apple, sage"],
    ["Cauliflower steak", 1650, "Tahini, pomegranate"],
    ["Sirloin, 250g", 3100, "Peppercorn sauce"],
    ["Octopus", 2300, "Potato, smoked paprika"],
  ],
  Sides: [
    ["Triple-cooked chips", 650, "Rosemary salt"],
    ["Buttered greens", 550, "Garlic, chilli"],
    ["Roast carrots", 600, "Honey, cumin"],
    ["House salad", 550, "Mustard vinaigrette"],
    ["Creamed potato", 600, null],
    ["Charred broccoli", 650, "Almond, lemon"],
    ["Focaccia", 450, "Rosemary, olive oil"],
  ],
  Desserts: [
    ["Tiramisu", 950, null],
    ["Basque cheesecake", 1050, "Burnt top, crème fraîche"],
    ["Chocolate nemesis", 1100, "Salted caramel"],
    ["Affogato", 750, "Espresso, vanilla"],
    ["Lemon tart", 950, "Torched meringue"],
    ["Panna cotta", 900, "Rhubarb"],
    ["Cheese plate", 1450, "Three cheeses, quince"],
    ["Sorbet", 700, "Blood orange"],
  ],
  Drinks: [],
};

/** Items that read as plausibly off tonight. */
const UNAVAILABLE = new Set(["Crab linguine", "Octopus", "Cheese plate", "Padrón peppers"]);

const CUSTOMER_NAMES = [
  "Amara Okafor", "Benedikt Lange", "Carla Núñez", "Dmitri Volkov", "Eleni Papadaki",
  "Farid Haddad", "Grace Mwangi", "Hana Kobayashi", "Idris Bello", "Júlia Ferreira",
  "Kwame Mensah", "Lucía Ortega", "Marek Nowak", "Nadia Rahman", "Oskar Lindqvist",
  "Priya Raghavan", "Quentin Dubois", "Rosa Marchetti", "Sofia Kallio", "Tomás Ibarra",
  "Ulrike Brandt", "Viktor Petrov", "Wendy Chau", "Yusuf Demir", "Zara Hussain",
];

const PREFERENCES = [
  "Window table", "No coriander", "Allergic to shellfish", "Prefers still water",
  "Celebrates anniversary in June", "Vegetarian", "Likes the corner booth",
  "Gluten free", "Always orders the ribeye", "Early sitting",
];

const KITCHEN_NOTES = [
  "Nut allergy on table — please confirm with kitchen.",
  "One plate without chilli.",
  "Birthday — candle on the dessert please.",
  "Running late, hold the mains 15 minutes.",
  "Extra napkins and a jug of tap water.",
  "Sauce on the side.",
];

/**
 * The status spread. Most of a fortnight's orders are done; a handful are live
 * on the pass right now, and a few were cancelled.
 */
const STATUS_SPREAD: OrderStatus[] = [
  ...Array<OrderStatus>(95).fill("completed"),
  ...Array<OrderStatus>(14).fill("cancelled"),
  ...Array<OrderStatus>(13).fill("pending"),
  ...Array<OrderStatus>(11).fill("confirmed"),
  ...Array<OrderStatus>(9).fill("preparing"),
  ...Array<OrderStatus>(8).fill("ready"),
];

/** The statuses an order at `final` actually passed through, in order. */
function lifecycle(final: OrderStatus): OrderStatus[] {
  const path: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed"];
  if (final === "cancelled") {
    // Cancelled from wherever it happened to be, not always from pending.
    const upto = between(1, 4);
    return [...path.slice(0, upto), "cancelled"];
  }
  return path.slice(0, path.indexOf(final) + 1);
}

if (reset) {
  // Drizzle records applied migrations in its own `drizzle` schema. Dropping
  // only `public` leaves that journal intact, so migrate() considers every
  // migration already applied and rebuilds nothing.
  await sql`DROP SCHEMA IF EXISTS public CASCADE`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql`CREATE SCHEMA public`;
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("schema dropped and re-migrated");
}

await sql`
  TRUNCATE TABLE
    order_events, order_items, orders, customers, menu_items, menu_categories, settings,
    opening_hours
  RESTART IDENTITY CASCADE
`;
// RESTART IDENTITY does not touch a standalone sequence, so order numbers would
// keep climbing across reseeds and stop being reproducible.
await sql`ALTER SEQUENCE order_number_seq RESTART WITH 1000`;

const categoryRows = await db.insert(menuCategories).values(CATEGORIES).returning();
const categoryByName = new Map(categoryRows.map((row) => [row.name, row.id]));

const itemValues = Object.entries(ITEMS).flatMap(([category, entries]) =>
  entries.map(([name, priceCents, description]) => ({
    categoryId: categoryByName.get(category)!,
    name,
    description,
    priceCents,
    isAvailable: !UNAVAILABLE.has(name),
  })),
);
const itemRows = await db.insert(menuItems).values(itemValues).returning();

await db.insert(settings).values({
  id: 1,
  isAcceptingOrders: true,
  // Off, so orders arrive pending and the needs-attention slice is populated.
  isAutoAccepting: false,
  prepTimeMinutes: 20,
});

/**
 * Lunch is not modelled separately — one interval per day is the scope cut, so
 * these run straight through. Closed Monday, the way a lot of kitchens are.
 */
await db.insert(openingHours).values(
  DAYS_OF_WEEK.map((day) => ({
    day,
    opensAt: day === "monday" ? null : "11:30",
    closesAt: day === "monday" ? null : day === "friday" || day === "saturday" ? "23:00" : "22:00",
  })),
);

const customerRows = await db
  .insert(customers)
  .values(
    CUSTOMER_NAMES.map((name, index) => ({
      name,
      // Some customers have no contact details at all. That is ordinary.
      phone: index % 5 === 0 ? null : `+44 7700 ${String(900000 + index * 137).slice(0, 6)}`,
      email: index % 7 === 0 ? null : `${name.split(" ")[0]!.toLowerCase()}@example.com`,
      preferences:
        index % 4 === 0
          ? []
          : Array.from(new Set([pick(PREFERENCES), pick(PREFERENCES)])).slice(0, between(1, 2)),
    })),
  )
  .returning();

const availableItems = itemRows.filter((item) => item.isAvailable);

// A fixed reference point rather than "now", so backdating is reproducible.
const NOW = new Date("2026-08-22T19:30:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

let walkIns = 0;

for (const [index, status] of STATUS_SPREAD.entries()) {
  // Live orders belong to today; finished ones spread back across a fortnight.
  const settled = status === "completed" || status === "cancelled";
  const daysAgo = settled ? between(0, 13) : 0;
  const placedAt = new Date(
    NOW.getTime() - daysAgo * DAY_MS - between(0, 11) * 60 * 60 * 1000 - between(0, 59) * 60 * 1000,
  );

  // Roughly one in six is a walk-in — an ordinary case, not missing data.
  const isWalkIn = index % 6 === 3;
  if (isWalkIn) walkIns += 1;

  const lines = Array.from({ length: between(1, 4) }, () => pick(availableItems)).map((item) => ({
    item,
    quantity: between(1, 3),
  }));

  // Same item picked twice becomes one line with the quantities added, which is
  // what a real till would do.
  const merged = new Map<string, { name: string; unitPriceCents: number; quantity: number }>();
  for (const line of lines) {
    const existing = merged.get(line.item.id);
    if (existing) existing.quantity += line.quantity;
    else
      merged.set(line.item.id, {
        name: line.item.name,
        unitPriceCents: line.item.priceCents,
        quantity: line.quantity,
      });
  }

  const totalCents = [...merged.values()].reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );

  const [order] = await db
    .insert(orders)
    .values({
      customerId: isWalkIn ? null : pick(customerRows).id,
      channel: pick(ORDER_CHANNELS),
      status,
      kitchenNote: index % 5 === 0 ? pick(KITCHEN_NOTES) : null,
      totalCents,
      placedAt,
      updatedAt: placedAt,
    })
    .returning({ id: orders.id });

  await db.insert(orderItems).values(
    [...merged.entries()].map(([menuItemId, line]) => ({
      orderId: order!.id,
      menuItemId,
      name: line.name,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: line.unitPriceCents * line.quantity,
    })),
  );

  // Every status the order actually passed through, not just its current one,
  // so the drawer's timeline has depth.
  const passed = lifecycle(status);
  await db.insert(orderEvents).values(
    passed.map((step, stepIndex) => ({
      orderId: order!.id,
      status: step,
      changedAt: new Date(placedAt.getTime() + stepIndex * between(6, 20) * 60 * 1000),
    })),
  );
}

const cancelled = STATUS_SPREAD.filter((status) => status === "cancelled").length;

await sql.end();

console.log(
  `seeded ${CATEGORIES.length} categories, ${itemRows.length} menu items, ` +
    `${customerRows.length} customers, ${STATUS_SPREAD.length} orders ` +
    `(${cancelled} cancelled, ${walkIns} walk-ins)`,
);
