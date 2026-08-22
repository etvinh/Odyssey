import { describe, expect, it } from "vitest";
import { filterOrders, tallyStatuses } from "../src/features/orders/filter";
import { orderRow } from "./setup";

describe("filterOrders by status", () => {
  const rows = [
    orderRow({ orderNumber: "1001", status: "pending" }),
    orderRow({ orderNumber: "1002", status: "ready" }),
    orderRow({ orderNumber: "1003", status: "pending" }),
  ];

  it("keeps only orders at the chosen status", () => {
    const kept = filterOrders(rows, { status: "pending", search: "" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1001", "1003"]);
  });

  it("keeps every order when no status is chosen", () => {
    const kept = filterOrders(rows, { status: "all", search: "" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1001", "1002", "1003"]);
  });
});

describe("filterOrders by search", () => {
  const rows = [
    orderRow({ orderNumber: "1042", customer: { id: "c1", name: "Priya Raman" } }),
    orderRow({ orderNumber: "1043", customer: { id: "c2", name: "Tomas Nowak" } }),
    // A walk-in: an ordinary case, not missing data.
    orderRow({ orderNumber: "1104", customer: null }),
  ];

  it("matches an order number", () => {
    const kept = filterOrders(rows, { status: "all", search: "1042" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1042"]);
  });

  it("matches part of an order number", () => {
    const kept = filterOrders(rows, { status: "all", search: "104" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1042", "1043", "1104"]);
  });

  it("matches a customer name", () => {
    const kept = filterOrders(rows, { status: "all", search: "Nowak" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1043"]);
  });

  it("ignores case in a customer name", () => {
    const kept = filterOrders(rows, { status: "all", search: "priya" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1042"]);
  });

  it("ignores surrounding whitespace", () => {
    const kept = filterOrders(rows, { status: "all", search: "  Nowak  " });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1043"]);
  });

  it("does not fall over on a walk-in", () => {
    const kept = filterOrders(rows, { status: "all", search: "raman" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["1042"]);
  });

  it("keeps every order when the search is empty", () => {
    const kept = filterOrders(rows, { status: "all", search: "" });
    expect(kept).toHaveLength(3);
  });

  it("applies the status and the search together", () => {
    const mixed = [
      orderRow({ orderNumber: "2001", status: "pending", customer: { id: "c1", name: "Priya" } }),
      orderRow({ orderNumber: "2002", status: "ready", customer: { id: "c1", name: "Priya" } }),
    ];
    const kept = filterOrders(mixed, { status: "ready", search: "priya" });
    expect(kept.map((order) => order.orderNumber)).toEqual(["2002"]);
  });
});

describe("tallyStatuses", () => {
  it("counts the orders at each status", () => {
    const rows = [
      orderRow({ orderNumber: "1", status: "pending" }),
      orderRow({ orderNumber: "2", status: "pending" }),
      orderRow({ orderNumber: "3", status: "ready" }),
    ];
    expect(tallyStatuses(rows)).toEqual({
      pending: 2,
      confirmed: 0,
      preparing: 0,
      ready: 1,
      completed: 0,
      cancelled: 0,
    });
  });

  it("zero-fills every status, so a chip never reads blank", () => {
    expect(tallyStatuses([])).toEqual({
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    });
  });

  it("sums to the number of orders it was given", () => {
    const rows = [
      orderRow({ orderNumber: "1", status: "completed" }),
      orderRow({ orderNumber: "2", status: "cancelled" }),
      orderRow({ orderNumber: "3", status: "preparing" }),
      orderRow({ orderNumber: "4", status: "completed" }),
    ];
    const summed = Object.values(tallyStatuses(rows)).reduce((a, b) => a + b, 0);
    expect(summed).toBe(4);
  });
});
