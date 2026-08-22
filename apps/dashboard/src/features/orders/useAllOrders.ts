import { useQuery } from "@tanstack/react-query";
import { getListOrdersQueryKey, listOrders, type OrderRow } from "@odyssey/api-client";
import { fetchAllPages } from "../paging";

/**
 * Every order, as one cache entry.
 *
 * Deliberately keyed under the paramless orders key, so the existing
 * `invalidateQueries({ queryKey: getListOrdersQueryKey() })` calls after a
 * create or an action still reach it.
 */
export function useAllOrders() {
  return useQuery({
    queryKey: [...getListOrdersQueryKey(), "all"],
    queryFn: ({ signal }) =>
      fetchAllPages<OrderRow>(async (page, pageSize) => {
        const response = await listOrders({ page, pageSize }, { signal });
        // Unreachable in practice — apiFetch throws on any non-2xx — but the
        // generated union has to be narrowed before `data` is readable.
        if (response.status !== 200) return { rows: [], total: 0 };
        return { rows: response.data.data, total: response.data.meta.total };
      }),
  });
}
