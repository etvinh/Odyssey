import { describe, expect, it } from "vitest";
import { filterCustomers } from "../src/features/crm/filter";
import { customerRow } from "./setup";

describe("filterCustomers", () => {
  const rows = [
    customerRow({ name: "Priya Raman", phone: "0400 111 222", email: "priya@example.com" }),
    customerRow({ name: "Tomas Nowak", phone: null, email: null }),
    customerRow({ name: "Ana Ramirez", phone: "0400 333 444", email: "ana@example.com" }),
  ];

  it("matches a name", () => {
    expect(filterCustomers(rows, "Nowak").map((c) => c.name)).toEqual(["Tomas Nowak"]);
  });

  it("ignores case", () => {
    expect(filterCustomers(rows, "priya").map((c) => c.name)).toEqual(["Priya Raman"]);
  });

  it("matches partway through a name", () => {
    expect(filterCustomers(rows, "Ram").map((c) => c.name)).toEqual(["Priya Raman", "Ana Ramirez"]);
  });

  it("matches a phone number", () => {
    expect(filterCustomers(rows, "333").map((c) => c.name)).toEqual(["Ana Ramirez"]);
  });

  it("matches an email", () => {
    expect(filterCustomers(rows, "ana@").map((c) => c.name)).toEqual(["Ana Ramirez"]);
  });

  it("does not fall over on a customer with no contact details", () => {
    expect(filterCustomers(rows, "0400").map((c) => c.name)).toEqual(["Priya Raman", "Ana Ramirez"]);
  });

  it("ignores surrounding whitespace", () => {
    expect(filterCustomers(rows, "  Nowak  ").map((c) => c.name)).toEqual(["Tomas Nowak"]);
  });

  it("keeps everyone when the search is empty", () => {
    expect(filterCustomers(rows, "")).toHaveLength(3);
  });
});
