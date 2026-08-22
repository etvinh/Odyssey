import { HomeScreen } from "../src/features/home/HomeScreen";

/**
 * Home is the root route now, rather than a redirect to Orders: the state of
 * the day is what the manager opens the app for.
 */
export default function Index() {
  return <HomeScreen />;
}
