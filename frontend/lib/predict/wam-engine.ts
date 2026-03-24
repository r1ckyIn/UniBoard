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
 * 1. For the target course, solve for required average on remaining weight.
 * 2. For all other courses, assume they score their current average on remaining.
 * 3. WAM equation: targetWAM = sum(final * cp * lw) / sum(cp * lw)
 */
export function computeRequired(
  courses: CourseComputeData[],
  targetWAM: number,
  scheme: FacultyScheme
): RequiredScoreResult[] {
  const getLW = FACULTY_WEIGHTS[scheme];

  // Total denominator across all courses
  const totalDen = courses.reduce(
    (sum, c) => sum + c.creditPoints * getLW(c.level),
    0
  );

  return courses.map((course, idx) => {
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

    // Assume other courses maintain their current average on remaining work
    let otherNum = 0;
    courses.forEach((o, oi) => {
      if (oi === idx) return;
      const oLw = getLW(o.level);
      if (oLw === 0) return;

      const { knownSum: oKS, knownWeight: oKW } = getKnownScores(o);
      const oRemain = 1.0 - oKW;
      const oAvg = oKW > 0 ? oKS / oKW : targetWAM / 100;
      // Final mark = (knownSum + avg * remainWeight) * 100
      const oFinal = (oKS + oAvg * oRemain) * 100;
      otherNum += oFinal * o.creditPoints * oLw;
    });

    // Solve: targetWAM * totalDen = otherNum + finalMark * cp * lw
    const neededFinal = (targetWAM * totalDen - otherNum) / (course.creditPoints * lw);
    // neededFinal is on 0-100 scale, knownSum is on 0-1 scale
    // finalMark = knownSum * 100 + requiredAvg * remainWeight
    // => requiredAvg = (neededFinal - knownSum * 100) / remainWeight
    const required = (neededFinal - knownSum * 100) / remainWeight;

    return { code: course.code, required, locked: false };
  });
}
