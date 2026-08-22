import { View } from "react-native";

/**
 * A stand-in for react-native-svg under test.
 *
 * The real package resolves its web build through Metro's `.web.js` extension
 * order, which vitest does not reproduce; loading the native file instead fails
 * on its Flow syntax. Icons are not what the component-state suites assert on —
 * they check labels, disabled state and which branch rendered — so a stub that
 * keeps the tree valid is enough, and it keeps one transform problem out of
 * every test in the package.
 */
const Stub = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;

export const Svg = Stub;
export const Path = Stub;
export const Circle = Stub;
export const G = Stub;
export const Rect = Stub;
export default Stub;
