import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { menuCategories } from "../src/db/schema.js";

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

await sql`TRUNCATE TABLE menu_categories RESTART IDENTITY CASCADE`;
await db.insert(menuCategories).values(CATEGORIES);
await sql.end();
console.log(`seeded ${CATEGORIES.length} menu categories`);
