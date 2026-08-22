import { z } from "@hono/zod-openapi";

/** Every collection read returns this, so a shared table types against it alone. */
export const ListMeta = z
  .object({
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .openapi("ListMeta");

/** Wraps a collection read in the shared envelope. */
export function listEnvelope<T extends z.ZodTypeAny>(item: T, name: string) {
  return z.object({ data: z.array(item), meta: ListMeta }).openapi(name);
}
