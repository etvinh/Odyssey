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

/**
 * `meta` defaults to ListMeta and is overridable so an endpoint can widen it —
 * see OrderListMeta in routes/orders.ts. A widened meta needs its own
 * `.openapi()` name or it overwrites ListMeta in components.schemas.
 */
export function listEnvelope<T extends z.ZodTypeAny>(
  item: T,
  name: string,
  meta: z.ZodTypeAny = ListMeta,
) {
  return z.object({ data: z.array(item), meta }).openapi(name);
}
