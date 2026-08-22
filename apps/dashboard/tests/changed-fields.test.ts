import { describe, expect, it } from "vitest";
import type { MenuItem } from "@odyssey/api-client";
import { changedFields } from "../src/features/menu/changed-fields";
import type { ItemDraft } from "../src/features/menu/MenuItemDialog";

/**
 * The PATCH body for a menu item edit. Sending unchanged fields would make
 * every save a full overwrite, so what this leaves out matters as much as what
 * it puts in.
 */
const item: MenuItem = {
  id: "item-1",
  categoryId: "cat-1",
  name: "Burrata",
  description: "With grilled sourdough",
  priceCents: 1400,
  isAvailable: true,
};

const draftOf = (overrides: Partial<ItemDraft> = {}): ItemDraft => ({
  name: item.name,
  description: item.description ?? "",
  priceCents: item.priceCents,
  isAvailable: item.isAvailable,
  ...overrides,
});

describe("changedFields", () => {
  it("sends nothing when nothing changed", () => {
    expect(changedFields(item, draftOf())).toEqual({});
  });

  it("sends only the field that changed", () => {
    expect(changedFields(item, draftOf({ priceCents: 1600 }))).toEqual({ priceCents: 1600 });
  });

  it("sends several fields when several changed", () => {
    expect(changedFields(item, draftOf({ name: "Burratina", isAvailable: false }))).toEqual({
      name: "Burratina",
      isAvailable: false,
    });
  });

  it("turns a cleared description into null, not an empty string", () => {
    // The API rejects a blank string on purpose; null is how a field is cleared.
    expect(changedFields(item, draftOf({ description: "" }))).toEqual({ description: null });
  });

  it("sends a rewritten description as text", () => {
    expect(changedFields(item, draftOf({ description: "With focaccia" }))).toEqual({
      description: "With focaccia",
    });
  });

  it("treats a null description on the item as empty rather than changed", () => {
    const undescribed = { ...item, description: null };
    expect(changedFields(undescribed, draftOf({ description: "" }))).toEqual({});
  });

  it("sends availability turned off", () => {
    expect(changedFields(item, draftOf({ isAvailable: false }))).toEqual({ isAvailable: false });
  });
});
