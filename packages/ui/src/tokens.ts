/**
 * The design tokens. One module, named by role rather than by value, so a
 * second theme is a swap and not a rewrite.
 *
 * Light only — a back office used at a desk between services, under ordinary
 * indoor light. Dark is a stated scope cut in PRODUCT.md, and the names below
 * are the reason it stays a swap: nothing downstream says "grey" or "green".
 */

const palette = {
  /**
   * Neutral greys, R=G=B at every step. No cast in either direction: a back
   * office looked at all service should be a white page with black type on it,
   * and any tint the screen adds is a tint the manager cannot turn off.
   *
   * Stepped by eye rather than by even hex intervals, because perceived
   * lightness is not linear — the gaps near white have to be smaller than the
   * gaps near black to read as an even ramp.
   */
  white: "#FFFFFF",
  grey50: "#FAFAFA",
  grey100: "#F3F3F3",
  grey200: "#E6E6E6",
  grey300: "#D2D2D2",
  grey500: "#767676",
  grey600: "#5A5A5A",
  grey800: "#333333",
  grey900: "#1A1A1A",

  /**
   * On. A switch is the one control where colour alone carries the state, so it
   * gets a green of its own rather than borrowing the action or success role —
   * both of which mean something different and would drift with them.
   */
  green: "#2F7D54",

  /**
   * Status. The one place colour is information rather than decoration: an
   * order's state has to be distinguishable down a column at a glance. Kept
   * conventional on purpose — a manager should not have to learn what these
   * mean, and every badge carries its label in text as well.
   */
  successWash: "#ECF7F0",
  success: "#17663C",
  warningWash: "#FEF6E7",
  warning: "#8A5D0B",
  dangerWash: "#FDEDED",
  danger: "#B3261E",
  dangerSolid: "#C62828",
  infoWash: "#EDF3FB",
  info: "#1F4E8C",
} as const;

export const color = {
  /** The page. */
  surface: palette.white,
  /** Lifted off the page: cards, menus, drawers. */
  surfaceRaised: palette.white,
  /** Recessed: table headers, the app sidebar, code. */
  surfaceSunken: palette.grey50,
  /** A row under the pointer. */
  surfaceHover: palette.grey100,
  /** A row that is selected or open. Darker than hover, or the two collide. */
  surfaceSelected: palette.grey200,

  foreground: palette.grey900,
  foregroundMuted: palette.grey600,
  foregroundSubtle: palette.grey500,

  border: palette.grey200,
  borderStrong: palette.grey300,

  /**
   * The primary action, and the active item in the sidebar.
   *
   * Black rather than a hue: on a screen that is mostly table, a coloured
   * button competes with the status badges that actually carry meaning. Weight
   * marks the action; colour is spent on order status, where it is information.
   */
  accent: palette.grey900,
  accentHover: palette.grey800,
  accentSubtle: palette.grey100,
  accentBorder: palette.grey200,
  accentForeground: palette.white,
  /** Text that acts — links, the active nav item. */
  accentText: palette.grey900,

  /** Focus ring. Never the only signal; drawn outside the control so it reads
   * against the page rather than against whatever it is ringing. */
  focus: palette.grey900,

  /** A switch in its on position. 4.9:1 against the page, so the state reads. */
  toggleOn: palette.green,

  successSurface: palette.successWash,
  successForeground: palette.success,
  warningSurface: palette.warningWash,
  warningForeground: palette.warning,
  dangerSurface: palette.dangerWash,
  dangerForeground: palette.danger,
  danger: palette.dangerSolid,
  infoSurface: palette.infoWash,
  infoForeground: palette.info,

  neutralSurface: palette.grey100,
  neutralForeground: palette.grey600,

  /** Behind a modal or drawer. */
  scrim: "rgba(0, 0, 0, 0.35)",

  /** Browser surfaces the page does not draw but still owns. */
  selection: palette.grey200,
  selectionForeground: palette.grey900,
} as const;

/**
 * Two families.
 *
 * `sans` carries everything. Plex is humanist and a little irregular — the
 * single-storey `g`, the flat-sided `a` — so a dense table reads as set rather
 * than as generated, without a display face competing above it.
 *
 * `mono` carries anything compared down a column. Plex Mono shares the sans's
 * skeleton, so a price column and its header look related.
 */
export const fontFamily = {
  sans: "IBMPlexSans_400Regular",
  sansMedium: "IBMPlexSans_500Medium",
  sansSemibold: "IBMPlexSans_600SemiBold",
  mono: "IBMPlexMono_400Regular",
  monoMedium: "IBMPlexMono_500Medium",
} as const;

/**
 * Hierarchy comes from size and weight, not from a change of voice. Tracking
 * tightens as size grows, which keeps large text from looking loose and small
 * text from looking cramped.
 */
export const type = {
  display: { fontSize: 27, lineHeight: 34, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.5 },
  heading: { fontSize: 19, lineHeight: 26, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.3 },
  subheading: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.1 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.sans, letterSpacing: 0 },
  bodyStrong: { fontSize: 14, lineHeight: 21, fontFamily: fontFamily.sansMedium, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.sans, letterSpacing: 0 },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.sansMedium,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  /** Tabular. Money, counts, order numbers. */
  data: { fontSize: 13, lineHeight: 20, fontFamily: fontFamily.mono, letterSpacing: -0.1 },
  /** The one number a KPI card exists to show. */
  kpi: { fontSize: 32, lineHeight: 38, fontFamily: fontFamily.sansSemibold, letterSpacing: -1 },
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

export const radius = { sm: 5, md: 8, lg: 12, pill: 999 } as const;

export const borderWidth = { hairline: 1, thick: 2 } as const;

/**
 * Every shadow carries an offset and a soft blur — light comes from above, so
 * depth reads as depth rather than as a halo.
 */
export const shadow = {
  flat: {},
  raised: {
    shadowColor: palette.grey900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  overlay: {
    shadowColor: palette.grey900,
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
