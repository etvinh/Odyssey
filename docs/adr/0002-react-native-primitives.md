# Hand-built design system on React Native primitives

The dashboard must be Expo + React Native + Web, and MUI — which an earlier draft of the component inventory was written against — cannot be used: it targets `react-dom` and has no React Native runtime. Rather than adopt a cross-platform kit like Tamagui or react-native-paper, we build every primitive ourselves in `packages/ui` on `View`, `Text`, `Pressable`, `TextInput`, `Modal`, and `FlatList`, styled with `StyleSheet.create` over one typed token module. The design system is the thing under evaluation, and the required UI library route should present components we wrote rather than someone else's library with our colors on it.

## Consequences

React Native has no table, so `DataTable` is a `FlatList` with column definitions and `accessibilityRole` set to table, row, and cell — React Native Web turns those into real ARIA semantics. It has no `:hover` or `:focus` either: hover and pressed come from `Pressable`'s render-prop state, focus from React Native Web's focus events, and every interactive primitive implements all four states explicitly.

One primitive was cut rather than built. Prep time uses `Stepper` instead of a slider — a slider needs `PanResponder` and careful hit targets to serve exactly one field, while `Stepper` gives an exact value, works from the keyboard, and was already needed by the order-quantity cart.
