import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { color, type as typeScale, type TypeStyle } from "./tokens";

export type TextProps = RNTextProps & {
  variant?: TypeStyle;
  /** Semantic role, not a colour name — so a theme swap reaches every caller. */
  tone?: "default" | "muted" | "subtle" | "accent" | "danger" | "success" | "inverse";
  align?: TextStyle["textAlign"];
};

const tones = {
  default: color.foreground,
  muted: color.foregroundMuted,
  subtle: color.foregroundSubtle,
  accent: color.accent,
  danger: color.dangerForeground,
  success: color.successForeground,
  inverse: color.accentForeground,
} as const;

/**
 * Every piece of text in the product goes through here, which is what keeps the
 * type scale honest: there is no ad-hoc fontSize anywhere downstream.
 */
export function Text({ variant = "body", tone = "default", align, style, ...rest }: TextProps) {
  return <RNText style={[typeScale[variant], { color: tones[tone] }, align ? { textAlign: align } : null, style]} {...rest} />;
}
