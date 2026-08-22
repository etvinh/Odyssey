import { describe, expect, it, beforeAll } from "vitest";
import { createApp } from "./app.js";

/**
 * Guards the generated contract. Everything downstream — packages/api-client,
 * and therefore every type the dashboard sees — is regenerated from this
 * document, so a silent change here is a silent change to the frontend.
 *
 * These assertions read the document the app actually serves. An earlier
 * version built its own via getOpenAPI31Document({ servers: [...] }) and so
 * asserted against its own input: it passed happily with the double-prefix bug
 * reintroduced. Read the real artifact, not a reconstruction of it.
 */
describe("OpenAPI document", () => {
  let doc: any;

  beforeAll(async () => {
    const res = await createApp().request("/api/v1/openapi.json");
    expect(res.status).toBe(200);
    doc = await res.json();
  });

  it("documents the menu categories read", () => {
    expect(Object.keys(doc.paths)).toContain("/api/v1/menu/categories");
  });

  it("names servers as an origin only", () => {
    // Paths already carry /api/v1. A prefix here too makes every generated
    // client request /api/v1/api/v1/... and 404 silently.
    for (const s of doc.servers ?? []) expect(s.url).not.toContain("/api/v1");
  });

  it("derives MenuCategory from the Drizzle column types", () => {
    const schema = doc.components.schemas.MenuCategory;
    expect(schema.properties.id.format).toBe("uuid");
    expect(schema.properties.sortOrder.type).toBe("integer");
    expect(schema.required).toEqual(
      expect.arrayContaining(["id", "name", "sortOrder", "itemCount"]),
    );
  });

  it("wraps collections in the shared list envelope", () => {
    expect(Object.keys(doc.components.schemas.ListMeta.properties)).toEqual([
      "total",
      "page",
      "pageSize",
    ]);
  });
});
