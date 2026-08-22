import { ActivityIndicator, View, type ViewStyle } from "react-native";
import { Interactive, focusRing } from "./Pressable";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { color, radius, space, borderWidth } from "./tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const height = { sm: 32, md: 40 } as const;
const padding = { sm: space[3], md: space[4] } as const;

/** Resting, hover and pressed fills per variant. Disabled is opacity, once. */
const fills: Record<ButtonVariant, { base: string; hover: string; press: string; border: string; tone: "inverse" | "default" | "danger" | "accent" }> = {
  primary: {
    base: color.accent,
    hover: color.accentHover,
    press: color.accentHover,
    border: "transparent",
    tone: "inverse",
  },
  secondary: {
    base: color.surface,
    hover: color.surfaceHover,
    press: color.surfaceSunken,
    border: color.borderStrong,
    tone: "default",
  },
  ghost: {
    base: "transparent",
    hover: color.surfaceHover,
    press: color.surfaceSunken,
    border: "transparent",
    tone: "default",
  },
  danger: {
    base: color.surface,
    hover: color.dangerSurface,
    press: color.dangerSurface,
    border: color.borderStrong,
    tone: "danger",
  },
};

export function Button({
  label,
  onPress,
  variant = "secondary",
  size = "md",
  icon,
  disabled,
  loading,
  fullWidth,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}) {
  const fill = fills[variant];
  const isOff = Boolean(disabled) || Boolean(loading);

  return (
    <Interactive
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isOff, busy: Boolean(loading) }}
      style={({ hovered, pressed, focused }): ViewStyle => ({
        height: height[size],
        paddingHorizontal: padding[size],
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: fill.border,
        backgroundColor: pressed ? fill.press : hovered && !isOff ? fill.hover : fill.base,
        opacity: isOff ? 0.45 : 1,
        alignSelf: fullWidth ? "stretch" : "flex-start",
        justifyContent: "center",
        ...focusRing(focused, color.focus),
      })}
    >
      {() => (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space[2] }}>
          {loading ? (
            <ActivityIndicator size="small" color={fill.tone === "inverse" ? color.accentForeground : color.foregroundMuted} />
          ) : icon ? (
            <Icon
              name={icon}
              size={size === "sm" ? 14 : 16}
              color={
                fill.tone === "inverse"
                  ? color.accentForeground
                  : fill.tone === "danger"
                    ? color.dangerForeground
                    : color.foregroundMuted
              }
            />
          ) : null}
          <Text variant="bodyStrong" tone={fill.tone === "inverse" ? "inverse" : fill.tone === "danger" ? "danger" : "default"}>
            {label}
          </Text>
        </View>
      )}
    </Interactive>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  size = 32,
  tone = "default",
}: {
  icon: IconName;
  onPress?: () => void;
  /** Required: an icon alone has no accessible name. */
  label: string;
  size?: number;
  tone?: "default" | "danger";
}) {
  return (
    <Interactive
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ hovered, pressed, focused }): ViewStyle => ({
        width: size,
        height: size,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed
          ? color.surfaceSunken
          : hovered
            ? tone === "danger"
              ? color.dangerSurface
              : color.surfaceHover
            : "transparent",
        ...focusRing(focused, color.focus),
      })}
    >
      {() => (
        <Icon
          name={icon}
          size={Math.round(size * 0.5)}
          color={tone === "danger" ? color.dangerForeground : color.foregroundMuted}
        />
      )}
    </Interactive>
  );
}
