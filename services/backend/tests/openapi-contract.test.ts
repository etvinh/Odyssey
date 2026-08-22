import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, it } from "vitest";
import { get, readJson, type OpenApiDocument } from "./setup.js";

/**
 * packages/api-client is generated from this document, so every type the
 * dashboard sees is downstream of it. These assertions read the document the
 * app actually serves rather than rebuilding one, which would only ever assert
 * against its own input.
 */
describe("OpenAPI document", () => {
  let doc: OpenApiDocument;

  beforeAll(async () => {
    doc = await readJson(await get("/openapi.json"));
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
    expect(doc.components.schemas.MenuCategory?.properties?.id?.format).toBe("uuid");
  });

  it("types sortOrder as an integer", () => {
    expect(doc.components.schemas.MenuCategory?.properties?.sortOrder?.type).toBe("integer");
  });

  it("requires every category field", () => {
    expect(doc.components.schemas.MenuCategory?.required).toEqual([
      "id",
      "name",
      "sortOrder",
      "itemCount",
    ]);
  });

  it("documents every orders operation", () => {
    expect(Object.keys(doc.paths).toSorted()).toEqual(
      [
        "/api/v1/menu/categories",
        "/api/v1/orders",
        "/api/v1/orders/{id}",
        "/api/v1/orders/{id}/actions",
      ].toSorted(),
    );
  });

  it("types an order number as a string, not the integer column", () => {
    // It is a display identifier, not a number to do arithmetic on.
    expect(doc.components.schemas.OrderRow?.properties?.orderNumber?.type).toBe("string");
  });

  it("requires allowedActions on the list row, not just the detail read", () => {
    // ADR-0003. Losing this field is how the state machine gets re-implemented
    // on the client, so it is asserted rather than assumed.
    expect(doc.components.schemas.OrderRow?.required).toContain("allowedActions");
  });

  it("requires allowedActions on the detail read", () => {
    expect(doc.components.schemas.OrderDetail?.required).toContain("allowedActions");
  });

  it("carries every status in the counts, none optional", () => {
    expect(doc.components.schemas.OrderStatusCounts?.required).toEqual([
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ]);
  });

  it("defines the error envelope the client already parses", () => {
    expect(Object.keys(doc.components.schemas.ApiErrorBody?.properties ?? {})).toEqual(["error"]);
  });

  it("defines the shared list envelope", () => {
    expect(Object.keys(doc.components.schemas.ListMeta?.properties ?? {})).toEqual([
      "total",
      "page",
      "pageSize",
    ]);
  });
});

/**
 * The document metadata is declared twice — in src/app.ts for the served route
 * and in scripts/emit-openapi.ts for the committed artifact. The client is
 * generated from the committed copy, so a drift between them ships types that
 * describe an API nobody serves.
 */
describe("committed openapi.json", () => {
  let served: OpenApiDocument;
  let committed: OpenApiDocument;

  beforeAll(async () => {
    served = await readJson(await get("/openapi.json"));
    committed = JSON.parse(await readFile("./openapi.json", "utf8")) as OpenApiDocument;
  });

  it("matches the document the app serves", () => {
    expect(committed).toEqual(served);
  });
});
