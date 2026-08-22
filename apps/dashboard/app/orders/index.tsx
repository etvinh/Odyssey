import { OrdersList } from "../../src/features/orders/OrdersList";

/** Route files stay thin and delegate to the composition. */
export default function OrdersScreen() {
  return <OrdersList />;
}
