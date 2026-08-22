import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { swaggerUI } from "@hono/swagger-ui";
import { menuRoutes } from "./routes/menu.js";
import { orderRoutes } from "./routes/orders.js";
import { customerRoutes } from "./routes/customers.js";
import { settingsRoutes } from "./routes/settings.js";
import { summaryRoutes } from "./routes/summary.js";
import { ApiException } from "./schemas/error.js";
import { createDb as realCreateDb, type DbFactory } from "./db/client.js";
import type { AppEnv } from "./env.js";

/**
 * `createDb` defaults to a real connection. Tests pass an adapter that hands
 * every handler the same transaction and then roll it back, which is what lets
 * a test observe behaviour without leaving rows behind.
 */
export function createApp(options: { createDb?: DbFactory } = {}) {
  const createDb = options.createDb ?? realCreateDb;

  const app = new OpenAPIHono<AppEnv>({
    /**
     * Zod rejections become the same envelope as everything else. Without this,
     * @hono/zod-openapi answers with its own un-enveloped shape and the
     * dashboard's fetcher reports NON_JSON_RESPONSE instead of the field errors
     * it was handed.
     *
     * Paths are dotted so a nested body error keys as `customer.name` — exactly
     * what a form needs to put the message under the right input.
     */
    defaultHook: (result, c) => {
      if (result.success) return;

      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".");
        // First issue per path wins; later ones are usually consequences.
        fields[path || "_"] ??= issue.message;
      }

      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "That request did not validate.",
            fields,
          },
        },
        422,
      );
    },
  });

  app.use("/api/v1/*", cors());

  // Handlers read the factory off the context instead of importing it, which
  // is the whole seam.
  app.use("*", async (c, next) => {
    c.set("createDb", createDb);
    await next();
  });

  /**
   * Handlers throw ApiException; this is where it becomes a response. Anything
   * else is a bug, so it answers 500 in the same envelope rather than Hono's
   * plain-text default — an unparseable body tells the client nothing.
   */
  app.onError((err, c) => {
    if (err instanceof ApiException) {
      return c.json(err.toBody(), err.status);
    }
    console.error(err);
    return c.json(
      { error: { code: "INTERNAL", message: "Something went wrong handling that request." } },
      500,
    );
  });

  app.route("/api/v1", menuRoutes);
  app.route("/api/v1", orderRoutes);
  app.route("/api/v1", customerRoutes);
  app.route("/api/v1", settingsRoutes);
  app.route("/api/v1", summaryRoutes);

  app.doc31("/api/v1/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Odyssey API", version: "1.0.0" },
    // Origin only. The documented paths already carry /api/v1, so putting
    // the prefix here too makes generated clients request it twice.
    servers: [{ url: "http://localhost:8787" }],
  });

  /**
   * A browsable read of the document above, so the contract can be exercised
   * without curl. Outside /api/v1 because it is not part of the API — nothing
   * generated from the OpenAPI document knows this route exists.
   */
  app.get("/docs", swaggerUI({ url: "/api/v1/openapi.json" }));

  return app;
}
