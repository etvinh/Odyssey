import { useLocalSearchParams } from "expo-router";
import { CustomerDetail } from "../../src/features/crm/CustomerDetail";

/**
 * A route rather than local state, so a customer is linkable and the back
 * button closes them. The list behind it belongs to the layout and stays put.
 */
export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CustomerDetail id={id} />;
}
