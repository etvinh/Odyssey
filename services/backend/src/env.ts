import type { DbFactory } from "./db/client.js";

export type Env = {
  DATABASE_URL: string;
};

/**
 * What every route module is generic over. `createDb` rides on the context
 * rather than being imported directly by handlers, so `createApp` can hand
 * them a different adapter — see db/client.ts.
 */
export type AppEnv = {
  Bindings: Env;
  Variables: { createDb: DbFactory };
};
