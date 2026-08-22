import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Context } from "hono";
import * as schema from "./schema.js";

/**
 * One driver, two runtimes. postgres.js speaks TCP in Node and reaches
 * cloudflare:sockets inside workerd, so the Worker and anything else that
 * needs a connection from application code share this module.
 *
 * A Worker must not hold a connection across requests, so this is called per
 * request rather than memoised at module scope.
 */
export function createDb(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1, prepare: false, fetch_types: false });
  return { db: drizzle(sql, { schema }), sql };
}

export type Db = ReturnType<typeof createDb>["db"];

/** Everything the connection lifecycle needs. Narrow on purpose: an adapter
 * that isn't a real pool — a transaction under test — only has to satisfy this. */
export type Releasable = { end: () => Promise<unknown> };

export type DbHandle = { db: Db; sql: Releasable };

/**
 * The seam. `createApp` takes one of these, so a caller decides what sits
 * behind the HTTP interface: a real connection in the Worker, or a transaction
 * that never commits under test.
 */
export type DbFactory = (databaseUrl: string) => DbHandle;

/**
 * Close the per-request connection. Always call this from a `finally`.
 *
 * Hono's executionCtx getter throws when the app is invoked without one
 * (app.request with no ctx, a Node adapter), which would turn a good response
 * into a 500 and mask the real error. So: hand the close to waitUntil when
 * there is a context, and await it when there isn't.
 */
export function releaseDb(c: Context, sql: Releasable): void | Promise<unknown> {
  const close = sql.end();
  try {
    c.executionCtx.waitUntil(Promise.resolve(close));
  } catch {
    return close;
  }
}
