import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";
const sql = postgres(url, { max: 1 });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");
