import { beforeAll, describe, expect, it } from "vitest";
import { get, readJson, type ListEnvelope, type MenuCategory } from "./setup.js";

describe("GET /menu/categories", () => {
  let response: Response;
  let body: ListEnvelope<MenuCategory>;

  beforeAll(async () => {
    response = await get("/menu/categories");
    body = await readJson(response);
  });

  it("responds 200", () => {
    expect(response.status).toBe(200);
  });

  it("returns the seeded categories", () => {
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("orders them by sortOrder", () => {
    const positions = body.data.map((category) => category.sortOrder);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
  });

  it("counts the returned rows in meta.total", () => {
    expect(body.meta.total).toBe(body.data.length);
  });

  it("reports the first page", () => {
    expect(body.meta.page).toBe(1);
  });

  it("shapes every row to the contract", () => {
    expect(body.data).toEqual(
      body.data.map(() => ({
        id: expect.any(String),
        name: expect.any(String),
        sortOrder: expect.any(Number),
        itemCount: expect.any(Number),
      })),
    );
  });
});
