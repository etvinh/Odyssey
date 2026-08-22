import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-zod";
import { eq } from "drizzle-orm";
import { DAYS_OF_WEEK } from "@odyssey/types";
import { openingHours, settings } from "../db/schema.js";
import { releaseDb, type Db } from "../db/client.js";
import type { AppEnv } from "../env.js";
import { errorResponse, validationFailed } from "../schemas/error.js";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                      */
/* -------------------------------------------------------------------------- */

const DayOfWeekSchema = z.enum(DAYS_OF_WEEK).openapi("DayOfWeek");

/** Zero-padded 24-hour wall clock. The format the check constraint enforces too. */
const TimeOfDay = z.string().regex(/^[0-2]\d:[0-5]\d$/, "Use HH:MM, such as 09:30");

/**
 * One day's interval. A null pair is a day the restaurant is closed — an
 * ordinary case, not missing data, which is why the row always exists.
 */
const OpeningHoursEntry = z
  .object({
    day: DayOfWeekSchema,
    opensAt: TimeOfDay.nullable(),
    closesAt: TimeOfDay.nullable(),
  })
  .openapi("OpeningHoursEntry");

const Settings = createSelectSchema(settings)
  .pick({ isAcceptingOrders: true, isAutoAccepting: true, prepTimeMinutes: true })
  .extend({ openingHours: z.array(OpeningHoursEntry) })
  .openapi("Settings");

/**
 * Every field optional: the two settings cards PATCH only their own fields, so
 * each stays independently dirty or clean.
 *
 * `openingHours` is a sparse list — the days it carries are replaced, the days
 * it omits are left alone. Sending the whole week to change one day would make
 * the hours card overwrite whatever another tab had just saved.
 */
const UpdateSettingsBody = createSelectSchema(settings)
  .pick({ isAcceptingOrders: true, isAutoAccepting: true })
  .extend({
    prepTimeMinutes: z.number().int().min(5).max(120),
    openingHours: z.array(OpeningHoursEntry),
  })
  .partial()
  .openapi("UpdateSettingsBody");

/* -------------------------------------------------------------------------- */
/* Rules                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The cross-field rules zod cannot express per-entry without losing the day in
 * the error path. Keyed by day rather than by array index, because the form has
 * a row per day and the index of a sparse list means nothing to it.
 */
function openingHoursErrors(entries: z.infer<typeof OpeningHoursEntry>[]): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const entry of entries) {
    const opens = entry.opensAt;
    const closes = entry.closesAt;

    if ((opens === null) !== (closes === null)) {
      // Half an interval is not a representable state. Point at whichever half
      // is missing, since that is the input still to be filled in.
      const missing = opens === null ? "opensAt" : "closesAt";
      fields[`openingHours.${entry.day}.${missing}`] =
        "Set both times, or clear both to close for the day.";
      continue;
    }

    if (opens !== null && closes !== null && opens >= closes) {
      // Cross-midnight service is unrepresentable by design — see PRODUCT.md.
      fields[`openingHours.${entry.day}.closesAt`] = "Closing time must be after opening time.";
    }
  }

  return fields;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/** The one place the settings shape is assembled. Both routes return it. */
async function loadSettings(db: Db) {
  const [row] = await db
    .select({
      isAcceptingOrders: settings.isAcceptingOrders,
      isAutoAccepting: settings.isAutoAccepting,
      prepTimeMinutes: settings.prepTimeMinutes,
    })
    .from(settings)
    .limit(1);

  const hours = await db
    .select({
      day: openingHours.day,
      opensAt: openingHours.opensAt,
      closesAt: openingHours.closesAt,
    })
    .from(openingHours);

  // Ordered here rather than in SQL: the enum's storage order is Monday-first
  // already, but relying on that would make the week's reading order an
  // accident of the migration. DAYS_OF_WEEK is where that order is decided.
  const byDay = new Map(hours.map((entry) => [entry.day, entry]));

  return {
    isAcceptingOrders: row?.isAcceptingOrders ?? true,
    isAutoAccepting: row?.isAutoAccepting ?? false,
    prepTimeMinutes: row?.prepTimeMinutes ?? 20,
    openingHours: DAYS_OF_WEEK.map(
      (day) => byDay.get(day) ?? { day, opensAt: null, closesAt: null },
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

const getSettings = createRoute({
  method: "get",
  path: "/settings",
  operationId: "getSettings",
  tags: ["Settings"],
  responses: {
    200: {
      description: "The service settings, with the full week of opening hours.",
      content: { "application/json": { schema: Settings } },
    },
  },
});

const updateSettings = createRoute({
  method: "patch",
  path: "/settings",
  operationId: "updateSettings",
  tags: ["Settings"],
  request: {
    body: { content: { "application/json": { schema: UpdateSettingsBody } }, required: true },
  },
  responses: {
    200: {
      description: "The settings after the change, whole rather than partial.",
      content: { "application/json": { schema: Settings } },
    },
    422: errorResponse("The body did not validate."),
  },
});

export const settingsRoutes = new OpenAPIHono<AppEnv>()
  .openapi(getSettings, async (c) => {
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);
    try {
      return c.json(await loadSettings(db), 200);
    } finally {
      await releaseDb(c, conn);
    }
  })

  .openapi(updateSettings, async (c) => {
    const body = c.req.valid("json");
    const { db, sql: conn } = c.var.createDb(c.env.DATABASE_URL);

    try {
      if (body.openingHours) {
        const fields = openingHoursErrors(body.openingHours);
        if (Object.keys(fields).length > 0) {
          throw validationFailed("Those opening hours are not valid.", fields);
        }
      }

      await db.transaction(async (tx) => {
        const columns = {
          ...(body.isAcceptingOrders === undefined
            ? {}
            : { isAcceptingOrders: body.isAcceptingOrders }),
          ...(body.isAutoAccepting === undefined ? {} : { isAutoAccepting: body.isAutoAccepting }),
          ...(body.prepTimeMinutes === undefined ? {} : { prepTimeMinutes: body.prepTimeMinutes }),
        };

        if (Object.keys(columns).length > 0) {
          await tx
            .update(settings)
            .set({ ...columns, updatedAt: new Date() })
            .where(eq(settings.id, 1));
        }

        for (const entry of body.openingHours ?? []) {
          // Upsert rather than update: the week is seven fixed rows, but a
          // database restored without them should not silently drop the change.
          await tx
            .insert(openingHours)
            .values({ day: entry.day, opensAt: entry.opensAt, closesAt: entry.closesAt })
            .onConflictDoUpdate({
              target: openingHours.day,
              set: { opensAt: entry.opensAt, closesAt: entry.closesAt },
            });
        }
      });

      return c.json(await loadSettings(db), 200);
    } finally {
      await releaseDb(c, conn);
    }
  });
