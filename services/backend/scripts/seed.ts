import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { menuCategories } from "../src/db/schema.js";

/**
 * `pnpm seed`        truncates the seeded tables and repopulates them.
 * `pnpm seed:reset`  drops the schema and re-migrates first.
 */
const reset = process.argv.includes("--reset");

const url = process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";
const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

// Deterministic, so two reviewers see identical data.
const CATEGORIES = [
  { name: "Small plates", sortOrder: 10 },
  { name: "Pasta", sortOrder: 20 },
  { name: "From the grill", sortOrder: 30 },
  { name: "Sides", sortOrder: 40 },
  { name: "Desserts", sortOrder: 50 },
  { name: "Drinks", sortOrder: 60 },
];

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

await sql`TRUNCATE TABLE menu_categories RESTART IDENTITY CASCADE`;
await db.insert(menuCategories).values(CATEGORIES);
await sql.end();

console.log(`seeded ${CATEGORIES.length} menu categories`);
