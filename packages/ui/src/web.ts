import type { TextStyle, ViewStyle } from "react-native";

/**
 * React Native Web accepts a handful of CSS properties React Native's own types
 * do not model — outlines chiefly, which is how a focus ring gets drawn on the
 * web without a shadow standing in for one.
 *
 * The cast lives here, once, rather than at every call site, so a search for
 * `as ViewStyle` in this package returns nothing and the web-only surface stays
 * enumerable.
 */
type WebOnlyStyle = {
  outlineStyle?: "none" | "solid" | "dotted" | "dashed";
  outlineWidth?: number;
  outlineColor?: string;
  outlineOffset?: number;
  transitionProperty?: string;
  transitionDuration?: string;
  transitionTimingFunction?: string;
  cursor?: "pointer" | "default" | "text" | "not-allowed";
  userSelect?: "none" | "text" | "auto";
};

export function web(style: WebOnlyStyle): ViewStyle & TextStyle {
  return style as ViewStyle & TextStyle;
}

/** The system's one transition: short, and easing out from an already-visible state. */
export const transition = (properties: string, ms: number) =>
  web({
    transitionProperty: properties,
    transitionDuration: `${ms}ms`,
    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
  });
