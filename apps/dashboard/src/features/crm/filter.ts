import type { Customer } from "@odyssey/api-client";

/**
 * The customers a search leaves visible, in the order they came in.
 *
 * Matches the three fields the table shows — name, phone, email — rather than
 * the server's name-only search: once the whole list is in memory there is no
 * reason to make someone remember which column their term lives in.
 */
export function filterCustomers(rows: Customer[], search: string): Customer[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((customer) =>
    [customer.name, customer.phone, customer.email].some((field) =>
      field?.toLowerCase().includes(needle),
    ),
  );
}
