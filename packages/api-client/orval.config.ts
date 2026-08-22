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
      clean: true,
      prettier: false,
      override: {
        // Routes every hook through src/fetcher.ts, which throws on non-2xx and
        // resolves the base URL at runtime. No baseUrl here on purpose: orval
        // bakes it into query keys as well as URLs.
        mutator: { path: "./src/fetcher.ts", name: "apiFetch" },
        query: { useQuery: true, signal: true },
      },
    },
  },
});
