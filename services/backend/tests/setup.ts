import { createApp } from "../src/app.js";

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
