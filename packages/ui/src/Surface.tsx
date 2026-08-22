import { View, type ViewProps } from "react-native";
import { color, radius, shadow, space, borderWidth } from "./tokens";
import { Text } from "./Text";

export function Surface({
  elevation = "flat",
  padded = true,
  style,
  ...rest
}: ViewProps & { elevation?: "flat" | "raised"; padded?: boolean }) {
  return (
    <View
      style={[
        {
          backgroundColor: color.surfaceRaised,
          borderRadius: radius.lg,
          borderWidth: borderWidth.hairline,
          borderColor: color.border,
          padding: padded ? space[4] : 0,
          ...(elevation === "raised" ? shadow.raised : shadow.flat),
        },
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * A titled region. More space above the title than below it, so the heading
 * binds to its own content rather than floating between two blocks.
 */
export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
        <Text variant="subheading">{title}</Text>
        <View style={{ flex: 1 }} />
        {actions}
      </View>
      {children}
    </View>
  );
}
