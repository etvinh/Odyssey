import { Image } from "react-native";
import LOCKUP from "../assets/odyssey-logo.png";
import MARK from "../assets/odyssey-mark.png";

/**
 * The Odyssey logo, in its two forms.
 *
 * `Logo` is the stacked lockup — mark over wordmark — for the sidebar, where
 * there is width to give it. `Logomark` is the mark alone, for the narrow top
 * bar, where the wordmark would shrink past reading and the product name is
 * carried by type beside it instead.
 *
 * Both come from the supplied artwork in public/img, cropped to their own
 * bounds and keyed off the white background so they sit on any surface. Sized
 * by height, because that is what has to align with the type beside them; the
 * width follows from the aspect ratio.
 */


/** Trimmed artwork ratios, so nothing is stretched. */
const LOCKUP_RATIO = 593 / 361;
const MARK_RATIO = 249 / 253;

export function Logo({ height = 84 }: { height?: number }) {
  return (
    <Image
      source={LOCKUP}
      accessibilityLabel="Odyssey"
      resizeMode="contain"
      style={{ height, width: height * LOCKUP_RATIO }}
    />
  );
}

export function Logomark({ size = 24 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      // Decorative here: the product name sits beside it as text.
      accessibilityElementsHidden
      importantForAccessibility="no"
      resizeMode="contain"
      style={{ height: size, width: size * MARK_RATIO }}
    />
  );
}
