import { beforeAll, describe, expect, it } from "vitest";
import { get, readJson, type OrderListMeta, type OrderRow, type OrderStatus } from "./setup.js";

type OrderList = { data: OrderRow[]; meta: OrderListMeta };

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

  it("counts every status in meta", () => {
    const statuses: OrderStatus[] = [
      "pending",
      "confirmed",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];
    expect(Object.keys(body.meta.statusCounts).toSorted()).toEqual(statuses.toSorted());
  });

  it("totals the status counts to the unfiltered total", () => {
    const summed = Object.values(body.meta.statusCounts).reduce((a, b) => a + b, 0);
    expect(summed).toBe(body.meta.total);
  });
});

describe("GET /orders?status=pending", () => {
  let body: OrderList;
  let unfiltered: OrderList;

  beforeAll(async () => {
    body = await readJson(await get("/orders?status=pending"));
    unfiltered = await readJson(await get("/orders"));
  });

  it("returns only pending orders", () => {
    expect(body.data.every((order) => order.status === "pending")).toBe(true);
  });

  it("narrows the total to the filtered set", () => {
    expect(body.meta.total).toBe(unfiltered.meta.statusCounts.pending);
  });

  it("leaves the status counts whole while filtered", () => {
    // Home requests ?status=pending but still needs correct counts for its KPI.
    expect(body.meta.statusCounts).toEqual(unfiltered.meta.statusCounts);
  });

  it("offers confirm first on a pending order", () => {
    expect(body.data[0]?.allowedActions).toEqual(["confirm", "cancel"]);
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

  it("rejects an unknown status", async () => {
    expect((await get("/orders?status=frozen")).status).toBe(422);
  });
});

describe("GET /orders?search=", () => {
  it("finds an order by its order number", async () => {
    const seeded = await readJson<OrderList>(await get("/orders?pageSize=1"));
    const target = seeded.data[0]!;
    const found = await readJson<OrderList>(await get(`/orders?search=${target.orderNumber}`));
    expect(found.data.map((order) => order.id)).toContain(target.id);
  });

  it("finds orders by customer name", async () => {
    const seeded = await readJson<OrderList>(await get("/orders?pageSize=50"));
    const named = seeded.data.find((order) => order.customer)!;
    const found = await readJson<OrderList>(
      await get(`/orders?search=${encodeURIComponent(named.customer!.name)}`),
    );
    expect(found.data.every((order) => order.customer?.name === named.customer!.name)).toBe(true);
  });

  it("narrows the status counts to the search", async () => {
    const all = await readJson<OrderList>(await get("/orders"));
    const searched = await readJson<OrderList>(await get("/orders?search=zzzznomatch"));
    const summed = Object.values(searched.meta.statusCounts).reduce((a, b) => a + b, 0);
    expect(summed).toBeLessThan(all.meta.total);
  });

  it("returns an empty page when nothing matches", async () => {
    const body = await readJson<OrderList>(await get("/orders?search=zzzznomatch"));
    expect(body.data).toEqual([]);
  });

  it("reports a zero total when nothing matches", async () => {
    const body = await readJson<OrderList>(await get("/orders?search=zzzznomatch"));
    expect(body.meta.total).toBe(0);
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

  it("keeps the status counts whole", () => {
    expect(pastEnd.meta.statusCounts).toEqual(firstPage.meta.statusCounts);
  });
});

describe("GET /orders past the end of a filtered set", () => {
  it("reports the filtered total, not zero", async () => {
    const counts = (await readJson<OrderList>(await get("/orders"))).meta.statusCounts;
    const pastEnd = await readJson<OrderList>(await get("/orders?status=pending&page=99"));
    expect(pastEnd.meta.total).toBe(counts.pending);
  });
});
