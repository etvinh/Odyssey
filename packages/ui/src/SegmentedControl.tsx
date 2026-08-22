import { View, type ViewStyle } from "react-native";
import { Interactive, focusRing } from "./Pressable";
import { Text } from "./Text";
import { color, radius, space, borderWidth } from "./tokens";
import { transition } from "./web";

export type Segment<T extends string> = { value: T; label: string; count?: number };

/**
 * A filter that shows how much it is filtering. The count rides inside the
 * segment because a filter chip without its size makes you click to find out.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: space[1],
        padding: space[0.5],
        alignSelf: "flex-start",
        backgroundColor: color.surfaceSunken,
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: color.border,
      }}
    >
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Interactive
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              segment.count === undefined ? segment.label : `${segment.label}, ${segment.count}`
            }
            style={({ hovered, pressed, focused }): ViewStyle => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space[2],
              paddingHorizontal: space[3],
              height: 28,
              borderRadius: radius.sm,
              backgroundColor: selected
                ? color.accent
                : pressed
                  ? color.surfaceSelected
                  : hovered
                    ? color.surface
                    : "transparent",
              ...transition("background-color", 120),
              ...focusRing(focused, color.focus),
            })}
          >
            {() => (
              <>
                <Text variant="bodyStrong" tone={selected ? "inverse" : "muted"}>
                  {segment.label}
                </Text>
                {segment.count === undefined ? null : (
                  <Text variant="caption" style={{ color: selected ? color.accentSubtle : color.foregroundSubtle }}>
                    {segment.count}
                  </Text>
                )}
              </>
            )}
          </Interactive>
        );
      })}
    </View>
  );
}
