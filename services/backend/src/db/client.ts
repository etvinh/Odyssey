import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

/**
 * One driver, two runtimes. postgres.js speaks TCP in Node and reaches
 * cloudflare:sockets inside workerd, so migrations, the seed script and the
 * Worker all share this module.
 *
 * A Worker must not hold a connection across requests, so this is called per
 * request rather than memoised at module scope.
 */
export function createDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1, prepare: false, fetch_types: false });
  return { db: drizzle(sql, { schema }), sql };
}

export type Db = ReturnType<typeof createDb>["db"];
