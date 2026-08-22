import { defineConfig } from "orval";

/**
 * The generated output in src/generated is COMMITTED — see ADR-0004 and
 * PRODUCT.md. Never hand-edit it; run `pnpm gen:contract`.
 */
export default defineConfig({
  odyssey: {
    input: "../../services/backend/openapi.json",
    output: {
      target: "./src/generated/odyssey.ts",
      schemas: "./src/generated/model",
      client: "react-query",
      httpClient: "fetch",
      baseUrl: "http://localhost:8787",
      clean: true,
      prettier: false,
      override: {
        query: { useQuery: true, signal: true },
      },
    },
  },
});
