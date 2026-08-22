import { useEffect, useState } from "react";

/**
 * A value that settles before it is used.
 *
 * Search boxes that drive a request need this: without it every keystroke is a
 * round trip, and the answers can land out of order so the table briefly shows
 * results for a prefix of what was typed.
 */
export function useDebounced<T>(value: T, delayMs = 250): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
