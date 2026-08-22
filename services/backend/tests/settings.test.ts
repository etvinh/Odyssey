import { describe, expect, it } from "vitest";
import { DAYS_OF_WEEK } from "@odyssey/types";
import { readJson, withRolledBackApp, type ApiErrorBody } from "./setup.js";

type Settings = {
  isAcceptingOrders: boolean;
  isAutoAccepting: boolean;
  prepTimeMinutes: number;
  openingHours: { day: string; opensAt: string | null; closesAt: string | null }[];
};

describe("GET /settings", () => {
  it("responds 200", async () => {
    await withRolledBackApp(async (client) => {
      expect((await client.get("/settings")).status).toBe(200);
    });
  });

  it("returns the singleton's fields", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(await client.get("/settings"));
      expect(Object.keys(body).toSorted()).toEqual([
        "isAcceptingOrders",
        "isAutoAccepting",
        "openingHours",
        "prepTimeMinutes",
      ]);
    });
  });

  it("carries every day of the week, Monday first", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(await client.get("/settings"));
      expect(body.openingHours.map((h) => h.day)).toEqual([...DAYS_OF_WEEK]);
    });
  });

  it("leaves both times null on a closed day", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(await client.get("/settings"));
      const closed = body.openingHours.filter((h) => h.opensAt === null);
      expect(closed.every((h) => h.closesAt === null)).toBe(true);
    });
  });
});

describe("PATCH /settings", () => {
  it("updates a single field and leaves the rest alone", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Settings>(await client.get("/settings"));
      const after = await readJson<Settings>(
        await client.patch("/settings", { prepTimeMinutes: 35 }),
      );
      expect(after.prepTimeMinutes).toBe(35);
      expect(after.isAcceptingOrders).toBe(before.isAcceptingOrders);
      expect(after.isAutoAccepting).toBe(before.isAutoAccepting);
    });
  });

  it("returns the whole settings shape, not just what changed", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(
        await client.patch("/settings", { isAutoAccepting: true }),
      );
      expect(Object.keys(body).toSorted()).toEqual([
        "isAcceptingOrders",
        "isAutoAccepting",
        "openingHours",
        "prepTimeMinutes",
      ]);
    });
  });

  it("persists the change", async () => {
    await withRolledBackApp(async (client) => {
      await client.patch("/settings", { isAcceptingOrders: false });
      const body = await readJson<Settings>(await client.get("/settings"));
      expect(body.isAcceptingOrders).toBe(false);
    });
  });

  it("replaces a day's hours", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(
        await client.patch("/settings", {
          openingHours: [{ day: "tuesday", opensAt: "08:00", closesAt: "16:00" }],
        }),
      );
      const tuesday = body.openingHours.find((h) => h.day === "tuesday");
      expect(tuesday).toEqual({ day: "tuesday", opensAt: "08:00", closesAt: "16:00" });
    });
  });

  it("leaves the days it was not sent untouched", async () => {
    await withRolledBackApp(async (client) => {
      const before = await readJson<Settings>(await client.get("/settings"));
      const after = await readJson<Settings>(
        await client.patch("/settings", {
          openingHours: [{ day: "tuesday", opensAt: "08:00", closesAt: "16:00" }],
        }),
      );
      const day = (s: Settings, d: string) => s.openingHours.find((h) => h.day === d);
      expect(day(after, "friday")).toEqual(day(before, "friday"));
    });
  });

  it("closes a day when both times are null", async () => {
    await withRolledBackApp(async (client) => {
      const body = await readJson<Settings>(
        await client.patch("/settings", {
          openingHours: [{ day: "friday", opensAt: null, closesAt: null }],
        }),
      );
      expect(body.openingHours.find((h) => h.day === "friday")).toEqual({
        day: "friday",
        opensAt: null,
        closesAt: null,
      });
    });
  });

  it("rejects a prep time below the range", async () => {
    await withRolledBackApp(async (client) => {
      expect((await client.patch("/settings", { prepTimeMinutes: 4 })).status).toBe(422);
    });
  });

  it("rejects a prep time above the range", async () => {
    await withRolledBackApp(async (client) => {
      expect((await client.patch("/settings", { prepTimeMinutes: 121 })).status).toBe(422);
    });
  });

  it("rejects a close that is not after the open", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/settings", {
        openingHours: [{ day: "tuesday", opensAt: "18:00", closesAt: "01:00" }],
      });
      expect(response.status).toBe(422);
    });
  });

  it("names the offending day and field in the error", async () => {
    // fields drives per-input errors in FormRow, so the key has to point at
    // the input the manager actually typed in.
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/settings", {
        openingHours: [{ day: "tuesday", opensAt: "18:00", closesAt: "01:00" }],
      });
      const body = await readJson<ApiErrorBody>(response);
      expect(Object.keys(body.error.fields ?? {})).toEqual(["openingHours.tuesday.closesAt"]);
    });
  });

  it("rejects one half of an interval", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/settings", {
        openingHours: [{ day: "tuesday", opensAt: "08:00", closesAt: null }],
      });
      expect(response.status).toBe(422);
    });
  });

  it("rejects a time that is not HH:MM", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/settings", {
        openingHours: [{ day: "tuesday", opensAt: "8am", closesAt: "16:00" }],
      });
      expect(response.status).toBe(422);
    });
  });

  it("rejects an unknown day", async () => {
    await withRolledBackApp(async (client) => {
      const response = await client.patch("/settings", {
        openingHours: [{ day: "caturday", opensAt: "08:00", closesAt: "16:00" }],
      });
      expect(response.status).toBe(422);
    });
  });
});
