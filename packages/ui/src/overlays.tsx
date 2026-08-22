import { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Button } from "./Button";
import { IconButton } from "./Button";
import { Text } from "./Text";
import { color, layout, radius, shadow, space, motion, borderWidth } from "./tokens";

/**
 * Escape closes, the scrim closes, and the close control is always reachable.
 * A modal that can only be dismissed by finding the right button is a trap.
 */
function useEscape(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, active]);
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 480 | 640;
}) {
  useEscape(onClose, open);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close dialog"
        style={{ flex: 1, backgroundColor: color.scrim, alignItems: "center", justifyContent: "center", padding: space[4] }}
      >
        {/* Stops a click inside the panel from reaching the scrim behind it. */}
        <Pressable
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: width,
            backgroundColor: color.surfaceRaised,
            borderRadius: radius.lg,
            ...shadow.overlay,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space[3],
              padding: space[4],
              borderBottomWidth: borderWidth.hairline,
              borderBottomColor: color.border,
            }}
          >
            <Text variant="subheading" style={{ flex: 1 }}>
              {title}
            </Text>
            <IconButton icon="close" label="Close" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={{ padding: space[4], gap: space[3] }}>{children}</ScrollView>

          {footer ? (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: space[2],
                padding: space[4],
                borderTopWidth: borderWidth.hairline,
                borderTopColor: color.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Names the consequence rather than asking "are you sure?". */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  confirmLabel,
  isWorking,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  consequence: string;
  confirmLabel: string;
  isWorking?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button label="Cancel" onPress={onClose} variant="ghost" />
          <Button label={confirmLabel} onPress={onConfirm} variant="primary" loading={isWorking} />
        </>
      }
    >
      <Text variant="body" tone="muted">
        {consequence}
      </Text>
    </Dialog>
  );
}

/**
 * A right-hand panel that slides in. Route-driven, so it is linkable and the
 * back button closes it.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { width: viewportWidth } = useWindowDimensions();
  const slide = useRef(new Animated.Value(1)).current;
  useEscape(onClose, open);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: open ? 0 : 1,
      duration: motion.durationSlow,
      useNativeDriver: true,
    }).start();
  }, [open, slide]);

  const panelWidth = Math.min(layout.drawerWidth, viewportWidth);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close panel"
        style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end", backgroundColor: color.scrim }}
      >
        <Animated.View
          style={{
            width: panelWidth,
            transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, panelWidth] }) }],
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            accessibilityViewIsModal
            style={{
              flex: 1,
              backgroundColor: color.surfaceRaised,
              borderLeftWidth: borderWidth.hairline,
              borderLeftColor: color.border,
              ...shadow.overlay,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space[3],
                padding: space[4],
                borderBottomWidth: borderWidth.hairline,
                borderBottomColor: color.border,
              }}
            >
              <Text variant="subheading" style={{ flex: 1 }}>
                {title}
              </Text>
              <IconButton icon="close" label="Close panel" onPress={onClose} />
            </View>

            <ScrollView contentContainerStyle={{ padding: space[4], gap: space[4] }}>{children}</ScrollView>

            {footer ? (
              <View
                style={{
                  gap: space[2],
                  padding: space[4],
                  borderTopWidth: borderWidth.hairline,
                  borderTopColor: color.border,
                  backgroundColor: color.surface,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
