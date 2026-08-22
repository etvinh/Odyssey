import { and, eq, isNull } from "drizzle-orm";
import { createApp } from "../src/app.js";
import { createDb, type Db } from "../src/db/client.js";
import { menuItems } from "../src/db/schema.js";

/**
 * Shared test environment. Registered as vitest `setupFiles`, and the single
 * place tests import their helpers and response types from.
 */

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";

/** Workers hand the handler an ExecutionContext; app.request does not. */
const executionCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

/** GET an API path, e.g. get("/menu/categories"). The /api/v1 prefix is added. */
export async function get(path: string): Promise<Response> {
  return createApp().request(`/api/v1${path}`, undefined, { DATABASE_URL }, executionCtx);
}

/** POST JSON to an API path. Same prefixing as get(). */
export async function post(path: string, body: unknown): Promise<Response> {
  return createApp().request(
    `/api/v1${path}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    { DATABASE_URL },
    executionCtx,
  );
}

/**
 * Parse a response body, reporting the actual payload when it isn't JSON.
 * Hono turns a thrown handler error into a 500 with a plain-text body, so
 * calling .json() directly on a failure yields "Unexpected token 'I'" instead
 * of the reason — most often that Postgres isn't running.
 */
export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new Error(
      `Expected JSON, got ${response.status}: ${text.slice(0, 200)}\n` +
        `If the database is unreachable, start it with: docker compose up -d`,
      { cause },
    );
  }
}

export type ListEnvelope<T> = {
  data: T[];
  meta: { total: number; page: number; pageSize: number };
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

/** Only the parts of the OpenAPI document the contract tests assert on. */
export type JsonSchema = {
  type?: string;
  format?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, unknown>;
  servers: { url: string }[];
  components: { schemas: Record<string, JsonSchema> };
};

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

/**
 * Order response shapes, hand-declared rather than imported from the generated
 * client. That is the point: a test that imports the types it is checking only
 * ever agrees with itself.
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type OrderAction = "confirm" | "start_preparing" | "mark_ready" | "complete" | "cancel";

export type OrderRow = {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string } | null;
  channel: "dine_in" | "takeaway" | "delivery";
  status: OrderStatus;
  itemCount: number;
  totalCents: number;
  placedAt: string;
  allowedActions: OrderAction[];
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string; phone: string | null } | null;
  channel: "dine_in" | "takeaway" | "delivery";
  status: OrderStatus;
  items: {
    id: string;
    menuItemId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }[];
  totalCents: number;
  kitchenNote: string | null;
  timeline: { status: OrderStatus; changedAt: string }[];
  allowedActions: OrderAction[];
};

export type OrderListMeta = {
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<OrderStatus, number>;
};

/**
 * Read straight from Postgres, for checking things the API deliberately hides —
 * that a rejected order left no customer behind, for instance.
 */
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const { db, sql } = createDb(DATABASE_URL);
  try {
    return await fn(db);
  } finally {
    await sql.end();
  }
}

/** An available menu item, for building create-order bodies. */
export async function anyAvailableMenuItem(): Promise<{ id: string; priceCents: number }> {
  const item = await withDb(async (db) => {
    const [row] = await db
      .select({ id: menuItems.id, priceCents: menuItems.priceCents })
      .from(menuItems)
      .where(and(isNull(menuItems.deletedAt), eq(menuItems.isAvailable, true)))
      .limit(1);
    return row;
  });
  if (!item) throw new Error("No available menu item. Run `pnpm seed`.");
  return item;
}

/** An unavailable menu item, for the ITEM_UNAVAILABLE cases. */
export async function anyUnavailableMenuItem(): Promise<{ id: string; name: string }> {
  const item = await withDb(async (db) => {
    const [row] = await db
      .select({ id: menuItems.id, name: menuItems.name })
      .from(menuItems)
      .where(and(isNull(menuItems.deletedAt), eq(menuItems.isAvailable, false)))
      .limit(1);
    return row;
  });
  if (!item) throw new Error("No unavailable menu item. Run `pnpm seed`.");
  return item;
}

/** Creates a fresh pending order the caller can drive without touching seeded rows. */
export async function createPendingOrder(): Promise<OrderDetail> {
  const item = await anyAvailableMenuItem();
  const response = await post("/orders", {
    channel: "dine_in",
    items: [{ menuItemId: item.id, quantity: 1 }],
  });
  const body = await readJson<OrderDetail>(response);
  if (response.status !== 201) {
    throw new Error(`Could not create a test order: ${JSON.stringify(body)}`);
  }
  return body;
}

/** The request surface handed to a withRolledBackApp body. */
export type RolledBackClient = {
  get: (path: string) => Promise<Response>;
  post: (path: string, body: unknown) => Promise<Response>;
};

/** Thrown to abort the transaction once the body has run. Never escapes. */
class Rollback extends Error {}

/**
 * Run requests against an app whose database handle is a single transaction,
 * then roll it back. Everything the requests wrote disappears.
 *
 * This is the payoff of the createDb seam: assertions can be exact, because no
 * other test's writes are visible inside the transaction and nothing this body
 * writes is visible outside it.
 */
export async function withRolledBackApp(
  fn: (client: RolledBackClient) => Promise<void>,
): Promise<void> {
  const { db, sql } = createDb(DATABASE_URL);

  try {
    await db.transaction(async (tx) => {
      // `end` is a no-op: the transaction outlives each request, and the real
      // pool is closed by the finally below.
      const app = createApp({ createDb: () => ({ db: tx as unknown as Db, sql: { end: async () => {} } }) });

      // app.request is typed Response | Promise<Response>; normalise it.
      const call = async (path: string, init?: RequestInit): Promise<Response> =>
        app.request(`/api/v1${path}`, init, { DATABASE_URL }, executionCtx);

      await fn({
        get: (path) => call(path),
        post: (path, body) =>
          call(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }),
      });

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  } finally {
    await sql.end();
  }
}
