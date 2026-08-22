import type { DayOfWeek } from "@odyssey/types";

/** "monday" as it reads on a door sign. */
export function dayLabel(day: DayOfWeek): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}
