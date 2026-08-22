import { View } from "react-native";
import { Icon } from "./Icon";
import { Surface } from "./Surface";
import { Text } from "./Text";
import { color, space } from "./tokens";

export type Trend = "up" | "down" | "flat";

/**
 * One headline figure with the context that makes it mean something.
 *
 * The delta line is never a bare percentage: "+12% " answers nothing on its own,
 * so the caller passes the comparison in words ("vs 18 yesterday"). A number
 * with no baseline is decoration.
 *
 * Direction is carried by an arrow and by the words, not by colour alone —
 * and `up` is deliberately not hard-wired to green, because more cancelled
 * orders is not good news.
 */
export function KpiStat({
  label,
  value,
  context,
  trend = "flat",
  tone = "neutral",
}: {
  label: string;
  value: string;
  context?: string;
  trend?: Trend;
  /** Whether the movement is good, bad, or neither. Defaults to neither. */
  tone?: "neutral" | "positive" | "negative";
}) {
  const mark = trend === "up" ? "trendUp" : trend === "down" ? "trendDown" : "trendFlat";
  const markColor =
    tone === "positive"
      ? color.successForeground
      : tone === "negative"
        ? color.dangerForeground
        : color.foregroundSubtle;

  return (
    <Surface style={{ flex: 1, minWidth: 200 }}>
      <View style={{ gap: space[1] }}>
        <Text variant="overline" tone="subtle">
          {label}
        </Text>
        <Text variant="kpi">{value}</Text>
        {context ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[1] }}>
            <Icon name={mark} size={13} color={markColor} />
            <Text variant="caption" tone="muted">
              {context}
            </Text>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
