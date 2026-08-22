import { ScrollView, View, useWindowDimensions, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Clock } from "./Clock";
import { Logo, Logomark } from "./Logo";
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
  serviceLabel,
  serviceDetail,
  serviceOpen,
  onNavigate,
  children,
}: {
  items: NavItem[];
  activeHref: string;
  /** The service state, shown at the foot of the sidebar. */
  serviceLabel?: string;
  /** Its supporting line — prep time, or why the door is shut. */
  serviceDetail?: string;
  serviceOpen?: boolean;
  onNavigate: (href: string) => void;
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

  /**
   * The top bar has one line to work with, so the mark carries the brand and
   * the name is set in type beside it.
   */
  const brand = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
      <Logomark size={24} />
      <Text variant="subheading" style={{ letterSpacing: 0.2 }}>
        Odyssey
      </Text>
    </View>
  );

  /**
   * The sidebar has the width for the lockup as drawn, so the wordmark comes
   * from the artwork rather than being set again in the interface face beside
   * it — two versions of the same word in two typefaces is the tell of a logo
   * dropped in rather than placed.
   */
  /**
   * The foot of the sidebar: ambient state, not a control.
   *
   * Down here rather than beside the wordmark because it is a thing to glance
   * at when you wonder, not a thing to read on arrival — and the bottom of a
   * fixed rail is where a status line is looked for.
   */
  const serviceFooter = serviceLabel ? (
    <View
      style={{
        gap: space[2],
        paddingTop: space[3],
        borderTopWidth: borderWidth.hairline,
        borderTopColor: color.border,
      }}
    >
      <StatusBadge label={serviceLabel} tone={serviceOpen ? "success" : "neutral"} />
      {serviceDetail ? (
        <Text variant="caption" tone="subtle">
          {serviceDetail}
        </Text>
      ) : null}
    </View>
  ) : null;

  const sidebarBrand = (
    <View style={{ gap: space[3], paddingHorizontal: space[1], paddingBottom: space[1] }}>
      <Logo height={78} />
      <Clock />
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
          {serviceFooter}
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
        <View style={{ paddingHorizontal: space[3], paddingTop: space[2] }}>{sidebarBrand}</View>
        {nav}
        {/* Takes the slack, so the footer sits on the floor of the rail
            however few nav items there are. */}
        <View style={{ flex: 1 }} />
        <View style={{ paddingHorizontal: space[3], paddingBottom: space[1] }}>
          {serviceFooter}
        </View>
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
