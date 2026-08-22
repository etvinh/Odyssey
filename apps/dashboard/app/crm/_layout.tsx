import { Slot } from "expo-router";
import { CustomersList } from "../../src/features/crm/CustomersList";

/**
 * The list lives in the layout, not in the routes beneath it — the same shape
 * as Orders. `/crm` and `/crm/[id]` share this layout, so the list is mounted
 * once and keeps its scroll position and its search while the drawer opens and
 * closes over it.
 */
export default function CrmLayout() {
  return (
    <>
      <CustomersList />
      <Slot />
    </>
  );
}
