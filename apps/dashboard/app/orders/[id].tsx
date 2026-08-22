import { useLocalSearchParams } from "expo-router";
import { OrderDetail } from "../../src/features/orders/OrderDetail";

/**
 * The detail view is a route rather than local state, so it is linkable and the
 * back button closes it.
 */
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetail id={id} />;
}
