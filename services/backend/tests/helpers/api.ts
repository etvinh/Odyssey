import { createApp } from "../../src/app.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";

/** Workers hand the handler an ExecutionContext; app.request does not. */
const executionCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

export async function get(path: string): Promise<Response> {
  return createApp().request(`/api/v1${path}`, undefined, { DATABASE_URL }, executionCtx);
}
