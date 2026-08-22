/**
 * Reading a whole paginated collection into memory.
 *
 * The dashboard filters, searches and tallies on the client (see the feature
 * `filter.ts` modules), and none of that can be right on a partial set — a chip
 * counting only the rows that fit on page one is worse than no chip. So a list
 * screen reads page one, learns the total from its meta, and fetches the rest.
 */

/** The API's cap on a page, so this walks a collection in as few reads as it can. */
export const PAGE_SIZE = 100;

/** One page of a collection, plus how many rows there are altogether. */
export type Page<T> = { rows: T[]; total: number };

export async function fetchAllPages<T>(
  readPage: (page: number, pageSize: number) => Promise<Page<T>>,
): Promise<T[]> {
  const first = await readPage(1, PAGE_SIZE);
  const remaining = Math.ceil(first.total / PAGE_SIZE) - 1;
  if (remaining < 1) return first.rows;

  // In parallel: the total is already known, so there is nothing to learn from
  // reading page two before page three.
  const rest = await Promise.all(
    Array.from({ length: remaining }, (_, index) => readPage(index + 2, PAGE_SIZE)),
  );

  return rest.reduce<T[]>((rows, page) => [...rows, ...page.rows], first.rows);
}
