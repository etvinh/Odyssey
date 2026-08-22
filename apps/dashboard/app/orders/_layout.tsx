import { Slot } from "expo-router";
import { OrdersList } from "../../src/features/orders/OrdersList";

/**
 * The list lives in the layout, not in the routes beneath it.
 *
 * That is what makes opening an order feel like opening a panel rather than
 * navigating away: `/orders` and `/orders/[id]` share this layout, so the list
 * is mounted once and keeps its scroll position, its filter and its search
 * while the drawer opens and closes over it. Rendering the list inside each
 * route instead remounts it on every navigation, which resets all three.
 *
 * The detail stays a real route, so it is still linkable and the back button
 * still closes it.
 */
export default function OrdersLayout() {
  return (
    <>
      <OrdersList />
      <Slot />
    </>
  );
}
