/** Paging arithmetic, as pure functions. */

/** The limit and offset for a 1-based page. */
export function pageWindow(page: number, pageSize: number): { limit: number; offset: number } {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}
