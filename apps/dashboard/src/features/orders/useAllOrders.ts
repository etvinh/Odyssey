import { useQuery } from "@tanstack/react-query";
import { getListOrdersQueryKey, listOrders, type OrderRow } from "@odyssey/api-client";

/** The API's cap on a page, so this walks the orders in as few reads as it can. */
const PAGE_SIZE = 100;

/**
 * Every order, as one cache entry.
 *
 * Filtering, searching and the status tally all happen in the dashboard now
 * (see ./filter.ts), and none of them can be right on a partial set — a chip
 * counting only the rows that fit on page one is worse than no chip. So this
 * reads page one, learns the total from its meta, and fetches whatever is left.
 *
 * Deliberately keyed under the paramless orders key, so the existing
 * `invalidateQueries({ queryKey: getListOrdersQueryKey() })` calls after a
 * create or an action still reach it.
 */
export function useAllOrders() {
  return useQuery({
    queryKey: [...getListOrdersQueryKey(), "all"],
    queryFn: async ({ signal }): Promise<OrderRow[]> => {
      const first = await listOrders({ page: 1, pageSize: PAGE_SIZE }, { signal });
      // Unreachable in practice — apiFetch throws on any non-2xx — but the
      // generated union has to be narrowed before `data` is readable.
      if (first.status !== 200) return [];

      const { total } = first.data.meta;
      const remaining = Math.ceil(total / PAGE_SIZE) - 1;
      if (remaining < 1) return first.data.data;

      const rest = await Promise.all(
        Array.from({ length: remaining }, (_, index) =>
          listOrders({ page: index + 2, pageSize: PAGE_SIZE }, { signal }),
        ),
      );

      return rest.reduce<OrderRow[]>(
        (rows, page) => (page.status === 200 ? [...rows, ...page.data.data] : rows),
        first.data.data,
      );
    },
  });
}
