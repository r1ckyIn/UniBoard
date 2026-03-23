/**
 * USYD grade band calculation based on WAM (Weighted Average Mark).
 *
 * Scale:
 *   HD  (High Distinction) : 85-100
 *   D   (Distinction)      : 75-84
 *   CR  (Credit)           : 65-74
 *   P   (Pass)             : 50-64
 *   F   (Fail)             : 0-49
 */
export function getGradeBand(mark: number | null | undefined): string {
  if (mark == null || Number.isNaN(mark)) return "\u2014";
  if (mark >= 85) return "HD";
  if (mark >= 75) return "D";
  if (mark >= 65) return "CR";
  if (mark >= 50) return "P";
  return "F";
}
