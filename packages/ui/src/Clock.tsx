import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { space } from "./tokens";

/**
 * The wall clock, for a back office where "was that order twenty minutes ago?"
 * is a question asked all service.
 *
 * Set in the tabular face on purpose: proportional digits change width as they
 * tick, so a clock set in the interface face jitters every minute in the corner
 * of someone's eye.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    /**
     * Re-armed to the next minute boundary rather than run on a 60s interval:
     * a fixed interval starts wherever it was mounted, so the display would
     * change up to a minute after the clock it is reporting.
     */
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000));
    };

    schedule();
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ gap: space[0.5] }}>
      <Text variant="data" style={{ fontSize: 15, lineHeight: 20 }}>
        {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </Text>
      <Text variant="caption" tone="subtle">
        {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </Text>
    </View>
  );
}
