/**
 * WAM-to-GPA 4.0 conversion and feasibility classification.
 *
 * Based on USYD grade scale:
 *   HD (85-100) -> 4.0
 *   D  (75-84)  -> 3.5
 *   CR (65-74)  -> 2.5
 *   P  (50-64)  -> 1.5
 *   F  (0-49)   -> 0.0
 */

/**
 * Convert WAM to GPA on a 4.0 scale (step-function mapping).
 */
export function wamToGpa(wam: number): number {
  if (wam >= 85) return 4.0;
  if (wam >= 75) return 3.5;
  if (wam >= 65) return 2.5;
  if (wam >= 50) return 1.5;
  return 0.0;
}

export type Feasibility = "feasible" | "warning" | "impossible";

/**
 * Classify how feasible a required score is.
 *   <= 85  feasible  (comfortable)
 *   <= 100 warning   (achievable but hard)
 *   > 100  impossible (mathematically impossible)
 */
export function getFeasibility(required: number): Feasibility {
  if (required <= 85) return "feasible";
  if (required <= 100) return "warning";
  return "impossible";
}
