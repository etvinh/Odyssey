/**
 * Paging arithmetic and list totals, as pure functions.
 *
 * `totalFromCounts` exists because the total was previously read off the
 * returned rows via `count(*) over ()`, which only produces a value when the
 * page has rows — so a page past the end reported a total of zero and the
 * pagination footer lost its way back. A total must not depend on how many
 * rows the requested page happened to contain.
 */

/** The limit and offset for a 1-based page. */
export function pageWindow(page: number, pageSize: number): { limit: number; offset: number } {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/**
 * The number of rows a filter matches, taken from bucketed counts that were
 * computed independently of paging.
 *
 * With no filter every bucket is summed; with one, that bucket is the answer.
 */
export function totalFromCounts<K extends string>(
  counts: Record<K, number>,
  filter?: K,
): number {
  if (filter) return counts[filter] ?? 0;
  return Object.values<number>(counts).reduce((sum, count) => sum + count, 0);
}
