import { useLocalSearchParams } from "expo-router";
import { OrderDetail } from "../../src/features/orders/OrderDetail";

/**
 * A route rather than local state, so an order is linkable and the back button
 * closes it. The list behind it belongs to the layout and stays put.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetail id={id} />;
}
