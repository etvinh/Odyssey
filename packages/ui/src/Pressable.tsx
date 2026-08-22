import { useState } from "react";
import { Pressable as RNPressable, type PressableProps, type ViewStyle } from "react-native";
import { web } from "./web";

export type InteractionState = {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
  disabled: boolean;
};

/**
 * React Native has no `:hover` and no `:focus`. Hover and press come from
 * Pressable's own state; focus comes from React Native Web's focus events. Every
 * interactive primitive in the system routes through here so all four states
 * are handled once rather than being remembered four times.
 */
export function Interactive({
  children,
  style,
  disabled,
  ...rest
}: Omit<PressableProps, "children" | "style"> & {
  children: (state: InteractionState) => React.ReactNode;
  style?: (state: InteractionState) => ViewStyle | ViewStyle[];
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <RNPressable
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => {
        const state = { hovered, pressed, focused, disabled: Boolean(disabled) };
        return style ? style(state) : undefined;
      }}
      {...rest}
    >
      {({ pressed }) =>
        children({ hovered, pressed, focused, disabled: Boolean(disabled) })
      }
    </RNPressable>
  );
}

/** The focus ring, drawn the same way everywhere it appears. */
export function focusRing(focused: boolean, ringColor: string): ViewStyle {
  return focused
    ? web({ outlineStyle: "solid", outlineWidth: 2, outlineColor: ringColor, outlineOffset: 2 })
    : {};
}
