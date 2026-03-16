/**
 * Client-side GPA/WAM calculation utilities.
 * Ported from Python GPAService logic for instant Predict page feedback.
 */

interface CourseWAMInput {
  wam: number;
  credit_points: number;
}

/**
 * Calculate weighted average mark across multiple courses.
 * Formula: sum(wam * credit_points) / sum(credit_points)
 */
export function calculateWAM(courses: CourseWAMInput[]): number {
  if (courses.length === 0) return 0;

  const totalWeighted = courses.reduce(
    (sum, c) => sum + c.wam * c.credit_points,
    0
  );
  const totalCredits = courses.reduce((sum, c) => sum + c.credit_points, 0);

  if (totalCredits === 0) return 0;
  return totalWeighted / totalCredits;
}

interface AssessmentInput {
  score: number | null;
  max_score: number;
  weight: number;
  hypothetical_score?: number;
}

/**
 * Calculate WAM for a single course based on its assessments.
 * Uses actual scores when available, falls back to hypothetical_score.
 * Skips assessments with no score and no hypothetical.
 */
export function calculateCourseWAM(assessments: AssessmentInput[]): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of assessments) {
    const effectiveScore = a.score ?? a.hypothetical_score;
    if (effectiveScore == null) continue;

    const pct = (effectiveScore / a.max_score) * 100;
    weightedSum += pct * a.weight;
    totalWeight += a.weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Map a WAM to its USYD grade band.
 * HD >= 85, D >= 75, CR >= 65, P >= 50, F < 50
 */
export function gradeBand(wam: number): string {
  if (wam >= 85) return "HD";
  if (wam >= 75) return "D";
  if (wam >= 65) return "CR";
  if (wam >= 50) return "P";
  return "F";
}
