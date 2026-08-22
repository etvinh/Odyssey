import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { color, radius, space, borderWidth } from "./tokens";

/**
 * A list has four states and this file holds three of them. Shipping a screen
 * that only renders the fourth is the most common way an interface breaks in
 * front of a real user.
 */

export function EmptyState({
  title,
  body,
  icon = "inbox",
  action,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: "center", gap: space[2], paddingVertical: space[12] }}>
      <Icon name={icon} size={22} color={color.foregroundSubtle} />
      <Text variant="subheading">{title}</Text>
      {body ? (
        <Text variant="body" tone="muted" align="center" style={{ maxWidth: 380 }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={{ paddingTop: space[2] }}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = "That didn’t load",
  cause,
  onRetry,
}: {
  title?: string;
  cause?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: space[2], paddingVertical: space[12] }}>
      <Icon name="alert" size={22} color={color.dangerForeground} />
      <Text variant="subheading">{title}</Text>
      {cause ? (
        <Text variant="body" tone="muted" align="center" style={{ maxWidth: 420 }}>
          {cause}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={{ paddingTop: space[2] }}>
          <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

export type AlertTone = "info" | "success" | "warning" | "danger";

const alertTones: Record<AlertTone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: color.infoSurface, fg: color.infoForeground, icon: "info" },
  success: { bg: color.successSurface, fg: color.successForeground, icon: "check" },
  warning: { bg: color.warningSurface, fg: color.warningForeground, icon: "alert" },
  danger: { bg: color.dangerSurface, fg: color.dangerForeground, icon: "alert" },
};

export function InlineAlert({
  tone = "info",
  message,
  onDismiss,
}: {
  tone?: AlertTone;
  message: string;
  onDismiss?: () => void;
}) {
  const { bg, fg, icon } = alertTones[tone];
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: space[2],
        backgroundColor: bg,
        borderRadius: radius.md,
        borderWidth: borderWidth.hairline,
        borderColor: "transparent",
        padding: space[3],
      }}
    >
      <View style={{ paddingTop: 1 }}>
        <Icon name={icon} size={15} color={fg} />
      </View>
      <Text variant="body" style={{ color: fg, flex: 1 }}>
        {message}
      </Text>
      {onDismiss ? <Button label="Dismiss" onPress={onDismiss} variant="ghost" size="sm" /> : null}
    </View>
  );
}

/**
 * The loading state. A shimmer rather than a spinner, because it holds the
 * shape of what is coming and so the layout does not jump when it arrives.
 */
export function Skeleton({ width, height = 14, radius: r = radius.sm }: { width?: number | `${number}%`; height?: number; radius?: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={{
        width: width ?? "100%",
        height,
        borderRadius: r,
        backgroundColor: shimmer.interpolate({
          inputRange: [0, 1],
          outputRange: [color.surfaceSunken, color.border],
        }),
      }}
    />
  );
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: space[3], paddingTop: space[2] }}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", gap: space[4], alignItems: "center" }}>
          <Skeleton width={64} />
          <Skeleton width={180} />
          <View style={{ flex: 1 }} />
          <Skeleton width={72} />
        </View>
      ))}
    </View>
  );
}
