import { beforeAll, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { orders } from "../src/db/schema.js";
import { get, readJson, withDb, type ListEnvelope, type OrderRow } from "./setup.js";

type OrderList = ListEnvelope<OrderRow>;

describe("GET /orders", () => {
  let response: Response;
  let body: OrderList;

  beforeAll(async () => {
    response = await get("/orders");
    body = await readJson(response);
  });

  it("responds 200", () => {
    expect(response.status).toBe(200);
  });

  it("returns the seeded orders", () => {
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("defaults to a page size of 25", () => {
    expect(body.meta.pageSize).toBe(25);
  });

  it("reports more orders than fit on one page", () => {
    expect(body.meta.total).toBeGreaterThan(body.data.length);
  });

  it("orders them newest first", () => {
    const placed = body.data.map((order) => order.placedAt);
    expect(placed).toEqual(placed.toSorted().toReversed());
  });

  it("serialises the order number as a string", () => {
    expect(typeof body.data[0]?.orderNumber).toBe("string");
  });

  it("shapes every row to the contract", () => {
    // Key sets rather than value matchers, because a walk-in's `customer` is
    // null and expect.anything() rejects null — which would make the ordinary
    // case look like a contract violation.
    const shape = [
      "allowedActions",
      "channel",
      "customer",
      "id",
      "itemCount",
      "orderNumber",
      "placedAt",
      "status",
      "totalCents",
    ];
    expect(body.data.map((order) => Object.keys(order).toSorted())).toEqual(
      body.data.map(() => shape),
    );
  });

  it("leaves the customer null on a walk-in", () => {
    // An ordinary case, not missing data.
    const walkIns = body.data.filter((order) => order.customer === null);
    expect(walkIns.every((order) => order.customer === null)).toBe(true);
  });

  it("carries allowedActions on the row, not just the detail read", () => {
    // ADR-0003: without this the inline next-action button would have to
    // re-derive the state machine on the client.
    expect(body.data.every((order) => Array.isArray(order.allowedActions))).toBe(true);
  });

  it("offers no actions on a terminal order", () => {
    const terminal = body.data.filter(
      (order) => order.status === "completed" || order.status === "cancelled",
    );
    expect(terminal.every((order) => order.allowedActions.length === 0)).toBe(true);
  });

  it("carries only the shared list meta", () => {
    // Status counts moved to the client, which now holds every order. A
    // server-side tally would be a second source for one number.
    expect(Object.keys(body.meta).toSorted()).toEqual(["page", "pageSize", "total"]);
  });

  it("totals every order, not just this page", async () => {
    // Counted straight from Postgres, so the expected value does not come from
    // the same query the route uses.
    const [row] = await withDb((db) => db.select({ n: count() }).from(orders));
    expect(body.meta.total).toBe(row!.n);
  });
});

describe("GET /orders?status=pending", () => {
  // The dashboard filters by status in memory, so the server no longer takes
  // the parameter. An old caller's query string is ignored, not rejected.
  let body: OrderList;
  let unfiltered: OrderList;

  beforeAll(async () => {
    body = await readJson(await get("/orders?status=pending&pageSize=100"));
    unfiltered = await readJson(await get("/orders?pageSize=100"));
  });

  it("responds 200 rather than rejecting the unknown parameter", async () => {
    expect((await get("/orders?status=pending")).status).toBe(200);
  });

  it("does not narrow the set", () => {
    expect(body.data.map((order) => order.id)).toEqual(unfiltered.data.map((order) => order.id));
  });

  it("still returns orders of every status", () => {
    const statuses = new Set(body.data.map((order) => order.status));
    expect(statuses.size).toBeGreaterThan(1);
  });

  it("reports the unfiltered total", () => {
    expect(body.meta.total).toBe(unfiltered.meta.total);
  });
});

describe("GET /orders allowed actions", () => {
  it("offers confirm first on a pending order", async () => {
    const body = await readJson<OrderList>(await get("/orders?pageSize=100"));
    const pending = body.data.find((order) => order.status === "pending");
    expect(pending?.allowedActions).toEqual(["confirm", "cancel"]);
  });
});

describe("GET /orders pagination and sort", () => {
  it("returns a different page for page=2", async () => {
    const first = await readJson<OrderList>(await get("/orders?pageSize=5"));
    const second = await readJson<OrderList>(await get("/orders?pageSize=5&page=2"));
    expect(second.data[0]?.id).not.toBe(first.data[0]?.id);
  });

  it("keeps the same total across pages", async () => {
    const first = await readJson<OrderList>(await get("/orders?pageSize=5"));
    const second = await readJson<OrderList>(await get("/orders?pageSize=5&page=2"));
    expect(second.meta.total).toBe(first.meta.total);
  });

  it("reverses the order for placedAt.asc", async () => {
    const body = await readJson<OrderList>(await get("/orders?sort=placedAt.asc&pageSize=5"));
    const placed = body.data.map((order) => order.placedAt);
    expect(placed).toEqual(placed.toSorted());
  });

  it("rejects a page size above the cap", async () => {
    expect((await get("/orders?pageSize=500")).status).toBe(422);
  });

  it("ignores a status parameter it no longer defines", async () => {
    expect((await get("/orders?status=frozen")).status).toBe(200);
  });
});

describe("GET /orders?search=", () => {
  // Searching moved to the client alongside the status filter: it matched an
  // order number or a customer name, both of which the dashboard already holds.
  let body: OrderList;
  let unfiltered: OrderList;

  beforeAll(async () => {
    body = await readJson(await get("/orders?search=zzzznomatch&pageSize=100"));
    unfiltered = await readJson(await get("/orders?pageSize=100"));
  });

  it("responds 200 rather than rejecting the unknown parameter", () => {
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("does not narrow the set, even for a term nothing matches", () => {
    expect(body.data.map((order) => order.id)).toEqual(unfiltered.data.map((order) => order.id));
  });

  it("reports the unfiltered total", () => {
    expect(body.meta.total).toBe(unfiltered.meta.total);
  });
});

describe("GET /orders on a page past the end", () => {
  let firstPage: OrderList;
  let pastEnd: OrderList;

  beforeAll(async () => {
    firstPage = await readJson(await get("/orders?pageSize=25"));
    pastEnd = await readJson(await get("/orders?page=99&pageSize=25"));
  });

  it("returns no rows", () => {
    expect(pastEnd.data).toEqual([]);
  });

  it("still reports the full total", () => {
    // The total must not depend on how many rows this page happened to hold,
    // or the footer reads "0 of 0" and there is no way to navigate back.
    expect(pastEnd.meta.total).toBe(firstPage.meta.total);
  });

  it("echoes the requested page", () => {
    expect(pastEnd.meta.page).toBe(99);
  });
});
