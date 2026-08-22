import { View } from "react-native";
import { color, radius, space, borderWidth } from "./tokens";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "info" | "accent" | "warning" | "success" | "danger";

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: color.neutralSurface, fg: color.neutralForeground },
  info: { bg: color.infoSurface, fg: color.infoForeground },
  accent: { bg: color.accentSubtle, fg: color.accent },
  warning: { bg: color.warningSurface, fg: color.warningForeground },
  success: { bg: color.successSurface, fg: color.successForeground },
  danger: { bg: color.dangerSurface, fg: color.dangerForeground },
};

/**
 * Reads by text first. The dot and the tint are reinforcement, never the only
 * signal — colour alone would fail anyone who cannot separate these hues.
 */
export function StatusBadge({
  label,
  tone = "neutral",
  dot = true,
}: {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
}) {
  const { bg, fg } = tones[tone];
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space[1],
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: radius.pill,
        borderWidth: borderWidth.hairline,
        borderColor: "transparent",
        paddingHorizontal: space[2],
        paddingVertical: space[0.5],
      }}
    >
      {dot ? <View style={{ width: 6, height: 6, borderRadius: radius.pill, backgroundColor: fg }} /> : null}
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
