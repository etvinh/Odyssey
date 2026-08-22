import { ScrollView, View, useWindowDimensions, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Interactive, focusRing } from "./Pressable";
import { Text } from "./Text";
import { StatusBadge } from "./StatusBadge";
import { color, layout, radius, space, borderWidth } from "./tokens";
import { transition } from "./web";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

/**
 * The frame every page sits in. A 240px sidebar on a wide viewport; below the
 * one breakpoint it becomes a top bar, because a fixed sidebar on a narrow
 * screen spends half the width on navigation.
 */
export function AppShell({
  items,
  activeHref,
  onNavigate,
  serviceLabel,
  serviceOpen,
  children,
}: {
  items: NavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  serviceLabel?: string;
  serviceOpen?: boolean;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= layout.breakpoint;

  const nav = (
    <View style={wide ? { gap: space[0.5] } : { flexDirection: "row", gap: space[1], flexWrap: "wrap" }}>
      {items.map((item) => {
        const active = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
        return (
          <Interactive
            key={item.href}
            onPress={() => onNavigate(item.href)}
            accessibilityRole="link"
            accessibilityState={{ selected: active }}
            style={({ hovered, pressed, focused }): ViewStyle => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space[2],
              paddingHorizontal: space[3],
              height: 34,
              borderRadius: radius.md,
              backgroundColor: active
                ? color.surfaceSelected
                : pressed
                  ? color.surfaceSunken
                  : hovered
                    ? color.surfaceHover
                    : "transparent",
              ...transition("background-color", 120),
              ...focusRing(focused, color.focus),
            })}
          >
            {() => (
              <>
                <Icon name={item.icon} size={16} color={active ? color.accent : color.foregroundSubtle} />
                <Text variant="bodyStrong" tone={active ? "accent" : "muted"}>
                  {item.label}
                </Text>
                {item.badge ? (
                  <>
                    <View style={{ flex: 1 }} />
                    <StatusBadge label={String(item.badge)} tone="accent" dot={false} />
                  </>
                ) : null}
              </>
            )}
          </Interactive>
        );
      })}
    </View>
  );

  const brand = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
      <Text variant="subheading">Odyssey</Text>
      {serviceLabel ? (
        <StatusBadge label={serviceLabel} tone={serviceOpen ? "success" : "neutral"} />
      ) : null}
    </View>
  );

  if (!wide) {
    return (
      <View style={{ flex: 1, backgroundColor: color.surface }}>
        <View
          style={{
            gap: space[3],
            padding: space[3],
            borderBottomWidth: borderWidth.hairline,
            borderBottomColor: color.border,
            backgroundColor: color.surfaceSunken,
          }}
        >
          {brand}
          {nav}
        </View>
        <ScrollView contentContainerStyle={{ padding: space[4] }}>{children}</ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: color.surface }}>
      <View
        style={{
          width: layout.sidebarWidth,
          padding: space[3],
          gap: space[6],
          borderRightWidth: borderWidth.hairline,
          borderRightColor: color.border,
          backgroundColor: color.surfaceSunken,
        }}
      >
        <View style={{ paddingHorizontal: space[3], paddingTop: space[2] }}>{brand}</View>
        {nav}
      </View>

      <ScrollView contentContainerStyle={{ padding: space[8], alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: layout.contentMaxWidth }}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Page title plus its actions. More space below than above, so it binds down. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space[4], paddingBottom: space[6] }}>
      <View style={{ flex: 1, gap: space[1] }}>
        <Text variant="display">{title}</Text>
        {subtitle ? (
          <Text variant="body" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={{ flexDirection: "row", gap: space[2] }}>{actions}</View> : null}
    </View>
  );
}
