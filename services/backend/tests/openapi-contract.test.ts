import { beforeAll, describe, expect, it } from "vitest";
import { get } from "./helpers/api.js";
import type { OpenApiDocument } from "./helpers/types.js";

/**
 * packages/api-client is generated from this document, so every type the
 * dashboard sees is downstream of it. These assertions read the document the
 * app actually serves rather than rebuilding one, which would only ever assert
 * against its own input.
 */
describe("OpenAPI document", () => {
  let doc: OpenApiDocument;

  beforeAll(async () => {
    doc = await (await get("/openapi.json")).json();
  });

  it("documents the menu categories read", () => {
    expect(Object.keys(doc.paths)).toContain("/api/v1/menu/categories");
  });

  it("names servers as an origin only", () => {
    // Paths already carry /api/v1. Repeating it here makes every generated
    // client request /api/v1/api/v1/... and 404 silently.
    expect(doc.servers.map((server) => server.url)).toEqual(["http://localhost:8787"]);
  });

  it("types a category id as a uuid", () => {
    expect(doc.components.schemas.MenuCategory.properties.id.format).toBe("uuid");
  });

  it("types sortOrder as an integer", () => {
    expect(doc.components.schemas.MenuCategory.properties.sortOrder.type).toBe("integer");
  });

  it("requires every category field", () => {
    expect(doc.components.schemas.MenuCategory.required).toEqual([
      "id",
      "name",
      "sortOrder",
      "itemCount",
    ]);
  });

  it("defines the shared list envelope", () => {
    expect(Object.keys(doc.components.schemas.ListMeta.properties)).toEqual([
      "total",
      "page",
      "pageSize",
    ]);
  });
});
