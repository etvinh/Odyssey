import { useQuery } from "@tanstack/react-query";
import { getListCustomersQueryKey, listCustomers, type Customer } from "@odyssey/api-client";
import { fetchAllPages } from "../paging";

/**
 * Every customer, as one cache entry — the CRM search runs in memory, the same
 * way the orders list does.
 *
 * Keyed under the paramless customers key so an order that creates a customer
 * still invalidates this: `OrderCreateDialog` already invalidates that key.
 */
export function useAllCustomers() {
  return useQuery({
    queryKey: [...getListCustomersQueryKey(), "all"],
    queryFn: ({ signal }) =>
      fetchAllPages<Customer>(async (page, pageSize) => {
        const response = await listCustomers({ page, pageSize }, { signal });
        if (response.status !== 200) return { rows: [], total: 0 };
        return { rows: response.data.data, total: response.data.meta.total };
      }),
  });
}
