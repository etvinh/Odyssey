/**
 * The design tokens. One module, named by role rather than by value, so a
 * second theme is a swap and not a rewrite.
 *
 * Light only — a back office used at a desk between services, under ordinary
 * indoor light. Dark is a stated scope cut in PRODUCT.md, and the names below
 * are the reason it stays a swap: nothing downstream says "grey" or "indigo".
 */

const palette = {
  white: "#FFFFFF",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate500: "#64748B",
  slate600: "#475569",
  slate900: "#0F172A",

  indigo50: "#EEF2FF",
  indigo100: "#E0E7FF",
  indigo500: "#6366F1",
  indigo600: "#4F46E5",
  indigo700: "#4338CA",

  emerald50: "#ECFDF5",
  emerald700: "#047857",
  amber50: "#FFFBEB",
  amber700: "#B45309",
  red50: "#FEF2F2",
  red600: "#DC2626",
  red700: "#B91C1C",
  sky50: "#F0F9FF",
  sky700: "#0369A1",
} as const;

export const color = {
  /** The page. */
  surface: palette.white,
  /** Lifted off the page: cards, menus, drawers. */
  surfaceRaised: palette.white,
  /** Recessed: table headers, the app sidebar, code. */
  surfaceSunken: palette.slate50,
  /** A row under the pointer. */
  surfaceHover: palette.slate50,
  /** A row that is selected or open. */
  surfaceSelected: palette.indigo50,

  foreground: palette.slate900,
  foregroundMuted: palette.slate500,
  foregroundSubtle: palette.slate400,

  border: palette.slate200,
  borderStrong: palette.slate300,

  accent: palette.indigo600,
  accentHover: palette.indigo700,
  accentSubtle: palette.indigo50,
  accentBorder: palette.indigo100,
  accentForeground: palette.white,

  /** Focus ring. Never the only signal, always visible against both surfaces. */
  focus: palette.indigo500,

  successSurface: palette.emerald50,
  successForeground: palette.emerald700,
  warningSurface: palette.amber50,
  warningForeground: palette.amber700,
  dangerSurface: palette.red50,
  dangerForeground: palette.red700,
  danger: palette.red600,
  infoSurface: palette.sky50,
  infoForeground: palette.sky700,

  neutralSurface: palette.slate100,
  neutralForeground: palette.slate600,

  /** Behind a modal or drawer. */
  scrim: "rgba(15, 23, 42, 0.32)",
} as const;

/**
 * Two families. `sans` carries the interface; `mono` carries anything you
 * compare down a column — money, counts, order numbers — because tabular
 * figures are what make a column of prices scannable.
 */
export const fontFamily = {
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemibold: "Inter_600SemiBold",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/**
 * Tracking tightens as size grows, which is what keeps large text from looking
 * loose and small text from looking cramped.
 */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 28, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.3 },
  subheading: { fontSize: 15, lineHeight: 22, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.sans, letterSpacing: 0 },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.sansMedium, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.sans, letterSpacing: 0 },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  /** Tabular. Money, counts, order numbers. */
  data: { fontSize: 13, lineHeight: 20, fontFamily: fontFamily.mono, letterSpacing: -0.2 },
  /** Tabular, large. The one number a KPI card exists to show. */
  kpi: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.mono, letterSpacing: -1 },
} as const;

export type TypeStyle = keyof typeof type;

/** 4-based ramp. Half-steps exist for optical nudges, not for layout. */
export const space = {
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const radius = { sm: 4, md: 6, lg: 10, pill: 999 } as const;

export const borderWidth = { hairline: 1, thick: 2 } as const;

/**
 * Every shadow carries an offset and a soft blur — light comes from above, so
 * depth reads as depth rather than as a halo.
 */
export const shadow = {
  flat: {},
  raised: {
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  overlay: {
    shadowColor: palette.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 16,
  },
} as const;

export const layout = {
  contentMaxWidth: 1180,
  sidebarWidth: 240,
  /** The one breakpoint: below it the sidebar collapses to a top bar. */
  breakpoint: 900,
  drawerWidth: 440,
} as const;

/** One duration and one curve, so motion across the system feels like one hand. */
export const motion = { duration: 160, durationSlow: 240 } as const;
