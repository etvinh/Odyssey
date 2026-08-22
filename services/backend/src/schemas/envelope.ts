import { z } from "@hono/zod-openapi";

/**
 * Every collection read returns this. Endpoints that need more widen `meta`
 * rather than replacing it, so a shared table can type against ListMeta alone.
 */
export const ListMeta = z
  .object({
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .openapi("ListMeta");

export function listEnvelope<T extends z.ZodTypeAny>(item: T, name: string) {
  return z.object({ data: z.array(item), meta: ListMeta }).openapi(name);
}
