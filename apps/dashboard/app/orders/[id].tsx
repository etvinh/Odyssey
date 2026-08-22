import { useLocalSearchParams } from "expo-router";
import { OrdersList } from "../../src/features/orders/OrdersList";
import { OrderDetail } from "../../src/features/orders/OrderDetail";

/**
 * The detail is a route rather than local state, so it is linkable and the back
 * button closes it — and it renders *over* the list, which stays mounted
 * behind the drawer exactly as it looked when the row was pressed.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <>
      <OrdersList />
      <OrderDetail id={id} />
    </>
  );
}
