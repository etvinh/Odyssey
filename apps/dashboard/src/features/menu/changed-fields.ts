import type { MenuItem } from "@odyssey/api-client";
import type { ItemDraft } from "./MenuItemDialog";

/** Only what actually changed goes in the PATCH. */
export function changedFields(item: MenuItem, draft: ItemDraft) {
  const data: Record<string, unknown> = {};
  if (draft.name !== item.name) data.name = draft.name;
  if (draft.description !== (item.description ?? "")) {
    // Cleared means null, not "": the API rejects a blank string on purpose.
    data.description = draft.description === "" ? null : draft.description;
  }
  if (draft.priceCents !== item.priceCents) data.priceCents = draft.priceCents;
  if (draft.isAvailable !== item.isAvailable) data.isAvailable = draft.isAvailable;
  return data;
}
