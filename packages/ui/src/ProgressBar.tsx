import { View } from "react-native";
import { color, radius } from "./tokens";

/**
 * A proportion, drawn.
 *
 * Always paired with its number by the caller — a bar alone is unreadable to
 * anyone who needs the actual figure, and unreachable to a screen reader
 * without one. That is why this takes no label of its own.
 */
export function ProgressBar({
  value,
  label,
  height = 6,
}: {
  /** A fraction between 0 and 1. Values outside that are clamped. */
  value: number;
  /** Accessible name — what proportion this is of what. */
  label: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radius.sm,
        backgroundColor: color.surfaceSunken,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          borderRadius: radius.sm,
          backgroundColor: color.accent,
        }}
      />
    </View>
  );
}
