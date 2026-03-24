/**
 * Pure WAM computation functions for the Grade Predictor page.
 *
 * All assessment weights use 0-1 scale (e.g. 0.15 = 15%).
 * All returned marks are on a 0-100 percentage scale.
 */

import { FACULTY_WEIGHTS } from "@/lib/predict/faculty-weights";
import type { FacultyScheme } from "@/lib/predict/faculty-weights";

export interface CourseComputeData {
  courseId: string;
  code: string;
  creditPoints: number;
  level: number;
  assessments: { weight: number; score: number | null; maxScore: number }[];
  predictions: Record<number, number | null>;
}

export interface RequiredScoreResult {
  code: string;
  required: number;
  locked?: boolean;
  excluded?: boolean;
}

/**
 * Compute current average over graded assessments only.
 * Weights are 0-1 scale. Returns percentage (0-100).
 */
export function computeCurrent(
  assessments: { weight: number; score: number | null; maxScore: number }[]
): number {
  let sumSW = 0;
  let sumW = 0;

  for (const a of assessments) {
    if (a.score !== null && a.maxScore > 0) {
      const normalized = a.score / a.maxScore;
      sumSW += normalized * a.weight;
      sumW += a.weight;
    }
  }

  return sumW > 0 ? (sumSW / sumW) * 100 : 0;
}

/**
 * Compute projected final including predictions for ungraded assessments.
 * Returns null if any ungraded assessment has no prediction.
 * Returns percentage (0-100).
 */
export function computeProjected(
  assessments: { weight: number; score: number | null; maxScore: number }[],
  predictions: Record<number, number | null>
): number | null {
  let sumSW = 0;
  let totalW = 0;
  let allFilled = true;

  assessments.forEach((a, i) => {
    totalW += a.weight;
    if (a.score !== null && a.maxScore > 0) {
      sumSW += (a.score / a.maxScore) * a.weight;
    } else {
      const pred = predictions[i];
      if (pred !== null && pred !== undefined) {
        const maxS = a.maxScore > 0 ? a.maxScore : 100;
        sumSW += (pred / maxS) * a.weight;
      } else {
        allFilled = false;
      }
    }
  });

  if (!allFilled) return null;
  return totalW > 0 ? (sumSW / totalW) * 100 : 0;
}

/**
 * Compute cross-course WAM using faculty-specific level weights.
 * WAM = sum(mark * cp * lw) / sum(cp * lw)
 * Courses with lw=0 are excluded from both numerator and denominator.
 */
export function computeWAM(
  courses: CourseComputeData[],
  scheme: FacultyScheme
): { wam: number; allFilled: boolean } {
  const getLW = FACULTY_WEIGHTS[scheme];
  let num = 0;
  let den = 0;
  let allFilled = true;

  for (const c of courses) {
    const lw = getLW(c.level);
    if (lw === 0) continue; // Excluded from WAM

    const projected = computeProjected(c.assessments, c.predictions);
    if (projected !== null) {
      num += projected * c.creditPoints * lw;
      den += c.creditPoints * lw;
    } else {
      // Use current mark for courses with partial scores
      const current = computeCurrent(c.assessments);
      num += current * c.creditPoints * lw;
      den += c.creditPoints * lw;
      allFilled = false;
    }
  }

  return { wam: den > 0 ? num / den : 0, allFilled };
}

/**
 * Helper: compute known (graded) sum and weight for a course.
 * Returns values on 0-1 scale (matching assessment weight format).
 */
function getKnownScores(course: CourseComputeData): {
  knownSum: number;
  knownWeight: number;
} {
  let knownSum = 0;
  let knownWeight = 0;

  for (const a of course.assessments) {
    if (a.score !== null && a.maxScore > 0) {
      knownSum += (a.score / a.maxScore) * a.weight;
      knownWeight += a.weight;
    }
  }

  return { knownSum, knownWeight };
}

/**
 * Reverse calculation: for each course, compute the minimum average score
 * needed on remaining assessments to achieve the target WAM.
 *
 * Algorithm (adapted from prototype predict.html):
 * Per-course calculation: what average score on remaining assessments
 * is needed for THIS course's final mark to reach targetWAM.
 *
 * finalMark = knownSum * 100 + required * remainWeight
 * targetWAM = knownSum * 100 + required * remainWeight
 * required = (targetWAM - knownSum * 100) / remainWeight
 */
export function computeRequired(
  courses: CourseComputeData[],
  targetWAM: number,
  scheme: FacultyScheme
): RequiredScoreResult[] {
  const getLW = FACULTY_WEIGHTS[scheme];

  return courses.map((course) => {
    const lw = getLW(course.level);

    // Excluded from WAM under this scheme
    if (lw === 0) {
      return { code: course.code, required: 0, excluded: true };
    }

    const { knownSum, knownWeight } = getKnownScores(course);
    const remainWeight = 1.0 - knownWeight; // weights are 0-1

    // All assessments graded: course is locked
    if (remainWeight <= 0.001) {
      return {
        code: course.code,
        required: computeCurrent(course.assessments),
        locked: true,
      };
    }

    // Solve per-course: what remaining avg makes this course's final = targetWAM
    // finalMark = (knownSum + requiredAvg_01 * remainWeight) * 100
    // targetWAM = (knownSum + requiredAvg_01 * remainWeight) * 100
    // requiredAvg_01 = (targetWAM / 100 - knownSum) / remainWeight
    // requiredAvg_pct = requiredAvg_01 * 100
    const required = ((targetWAM / 100 - knownSum) / remainWeight) * 100;

    return { code: course.code, required, locked: false };
  });
}
