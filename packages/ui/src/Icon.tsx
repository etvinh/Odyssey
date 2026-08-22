import Svg, { Path } from "react-native-svg";
import { color as tokens } from "./tokens";

/**
 * The icon set. Drawn paths on a 24-grid, one 1.75 stroke weight, round caps
 * and joins throughout — so icons sit together as one family rather than as
 * assorted glyphs. Add to `paths` rather than reaching for a character.
 */
const paths = {
  search: ["M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", "M21 21l-4.35-4.35"],
  close: ["M18 6 6 18", "M6 6l12 12"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M12 5v14", "M5 12h14"],
  chevronDown: ["M6 9l6 6 6-6"],
  chevronRight: ["M9 6l6 6-6 6"],
  chevronLeft: ["M15 6l-6 6 6 6"],
  arrowLeft: ["M19 12H5", "M12 19l-7-7 7-7"],
  pencil: ["M12 20h9", "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M19 6l-1 14H6L5 6", "M10 11v6", "M14 11v6"],
  clipboard: [
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    "M9 2h6v4H9z",
  ],
  book: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"],
  layers: ["M12 2 2 7l10 5 10-5-10-5Z", "M2 17l10 5 10-5", "M2 12l10 5 10-5"],
  alert: ["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L14.7 3.9a2 2 0 0 0-3.4 0Z"],
  info: ["M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0", "M12 16v-4", "M12 8h.01"],
  inbox: [
    "M22 12h-6l-2 3h-4l-2-3H2",
    "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z",
  ],
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 16,
  color = tokens.foregroundMuted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export const iconNames = Object.keys(paths) as IconName[];
