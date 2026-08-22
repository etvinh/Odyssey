import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { menuRoutes } from "./routes/menu.js";
import type { Env } from "./env.js";

export function createApp() {
  const app = new OpenAPIHono<{ Bindings: Env }>();

  app.use("/api/v1/*", cors());

  app.route("/api/v1", menuRoutes);

  app.doc31("/api/v1/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Odyssey API", version: "1.0.0" },
    // Origin only. The documented paths already carry /api/v1, so putting
    // the prefix here too makes generated clients request it twice.
    servers: [{ url: "http://localhost:8787" }],
  });

  return app;
}
