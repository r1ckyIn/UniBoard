/**
 * Pixel-mapping utilities for the timetable grid.
 *
 * Two density zones:
 *   - Normal  (8:00-19:00): 60 px per hour  -> 11h * 60 = 660px
 *   - Evening (19:00-23:00): 28 px per hour  -> 4h * 28 = 112px
 *   Total grid height: 772px
 */

export const NORMAL_PX_PER_HOUR = 60;
export const COMPRESSED_PX_PER_HOUR = 28;
export const EVENING_START = 19;
export const NORMAL_ZONE_END_PX = 660;
export const GRID_HEIGHT = 772;

/**
 * Convert a decimal hour (8-23) to a Y pixel offset within the grid.
 * Hours 8-19 use 60px/h; hours 19-23 use 28px/h.
 */
export function timeToY(hour: number): number {
  if (hour < EVENING_START) {
    return (hour - 8) * NORMAL_PX_PER_HOUR;
  }
  return NORMAL_ZONE_END_PX + (hour - EVENING_START) * COMPRESSED_PX_PER_HOUR;
}

/**
 * Format a decimal hour as "HH:MM".
 * e.g. 14.5 -> "14:30", 9 -> "09:00"
 */
export function formatTime(hour: number): string {
  const hr = Math.floor(hour);
  const m = Math.round((hour - hr) * 60);
  return `${hr < 10 ? "0" : ""}${hr}:${m < 10 ? "0" : ""}${m}`;
}
