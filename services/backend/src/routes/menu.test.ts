import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://odyssey:odyssey@127.0.0.1:5432/odyssey";

/** Workers hand the handler an ExecutionContext; app.request does not. */
const ctx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

type Category = { id: string; name: string; sortOrder: number; itemCount: number };
type Envelope = { data: Category[]; meta: { total: number; page: number; pageSize: number } };

async function listCategories(): Promise<Envelope> {
  const res = await createApp().request(
    "/api/v1/menu/categories",
    undefined,
    { DATABASE_URL },
    ctx,
  );
  expect(res.status).toBe(200);
  return (await res.json()) as Envelope;
}

describe("GET /api/v1/menu/categories", () => {
  it("returns seeded categories in the list envelope", async () => {
    const body = await listCategories();

    expect(body.meta.page).toBe(1);
    expect(body.meta.total).toBe(body.data.length);
    expect(body.data.length).toBeGreaterThan(0);

    for (const c of body.data) {
      expect(c).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        sortOrder: expect.any(Number),
        itemCount: expect.any(Number),
      });
    }
  });

  it("orders by sortOrder", async () => {
    const { data } = await listCategories();
    const orders = data.map((c) => c.sortOrder);
    expect(orders).toEqual(orders.toSorted((a, b) => a - b));
  });
});
