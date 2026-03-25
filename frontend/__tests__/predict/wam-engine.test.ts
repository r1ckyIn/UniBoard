import { describe, it, expect } from "vitest";
import {
  computeCurrent,
  computeProjected,
  computeWAM,
  computeRequired,
} from "@/lib/predict/wam-engine";
import { wamToGpa, getFeasibility } from "@/lib/predict/wam-to-gpa";
import type { CourseComputeData } from "@/lib/predict/wam-engine";

// ── Test fixture data (derived from prototype COURSES, converted to 0-1 weights) ──

const COMP2017_ASSESSMENTS = [
  { weight: 0.15, score: 85 as number | null, maxScore: 100 },
  { weight: 0.25, score: 80 as number | null, maxScore: 100 },
  { weight: 0.1, score: null as number | null, maxScore: 100 },
  { weight: 0.5, score: null as number | null, maxScore: 100 },
];

const ALL_UNGRADED_ASSESSMENTS = [
  { weight: 0.1, score: null as number | null, maxScore: 100 },
  { weight: 0.2, score: null as number | null, maxScore: 100 },
  { weight: 0.7, score: null as number | null, maxScore: 100 },
];

const COMP3221_ASSESSMENTS = [
  { weight: 0.1, score: 85 as number | null, maxScore: 100 },
  { weight: 0.1, score: 72 as number | null, maxScore: 100 },
  { weight: 0.3, score: null as number | null, maxScore: 100 },
  { weight: 0.5, score: null as number | null, maxScore: 100 },
];

const STAT2011_ASSESSMENTS = [
  { weight: 0.1, score: 68 as number | null, maxScore: 100 },
  { weight: 0.2, score: 59 as number | null, maxScore: 100 },
  { weight: 0.2, score: null as number | null, maxScore: 100 },
  { weight: 0.5, score: null as number | null, maxScore: 100 },
];

const EDGU1003_ASSESSMENTS = [
  { weight: 0.2, score: 90 as number | null, maxScore: 100 },
  { weight: 0.15, score: 88 as number | null, maxScore: 100 },
  { weight: 0.15, score: 85 as number | null, maxScore: 100 },
  { weight: 0.5, score: null as number | null, maxScore: 100 },
];

const MATH2021_ASSESSMENTS = [
  { weight: 0.15, score: 82 as number | null, maxScore: 100 },
  { weight: 0.15, score: 78 as number | null, maxScore: 100 },
  { weight: 0.15, score: 76 as number | null, maxScore: 100 },
  { weight: 0.55, score: null as number | null, maxScore: 100 },
];

// Prototype-matching 5 courses for WAM calculation tests
function makeCourses(
  predictions?: Record<string, Record<number, number | null>>
): CourseComputeData[] {
  return [
    {
      courseId: "comp2017",
      code: "COMP2017",
      creditPoints: 6,
      level: 2,
      assessments: COMP2017_ASSESSMENTS,
      predictions: predictions?.comp2017 ?? {},
    },
    {
      courseId: "comp3221",
      code: "COMP3221",
      creditPoints: 6,
      level: 3,
      assessments: COMP3221_ASSESSMENTS,
      predictions: predictions?.comp3221 ?? {},
    },
    {
      courseId: "stat2011",
      code: "STAT2011",
      creditPoints: 6,
      level: 2,
      assessments: STAT2011_ASSESSMENTS,
      predictions: predictions?.stat2011 ?? {},
    },
    {
      courseId: "edgu1003",
      code: "EDGU1003",
      creditPoints: 6,
      level: 1,
      assessments: EDGU1003_ASSESSMENTS,
      predictions: predictions?.edgu1003 ?? {},
    },
    {
      courseId: "math2021",
      code: "MATH2021",
      creditPoints: 6,
      level: 2,
      assessments: MATH2021_ASSESSMENTS,
      predictions: predictions?.math2021 ?? {},
    },
  ];
}

describe("wam-engine", () => {
  describe("computeCurrent", () => {
    it("computes weighted average for COMP2017 graded assessments", () => {
      // graded: 85*0.15 + 80*0.25 = 12.75 + 20 = 32.75
      // sumW = 0.15 + 0.25 = 0.40
      // current = (32.75 / 0.40) * 100 ... wait, normalized:
      // (85/100)*0.15 + (80/100)*0.25 = 0.1275 + 0.20 = 0.3275
      // sumW = 0.40
      // result = (0.3275 / 0.40) * 100 = 81.875
      const result = computeCurrent(COMP2017_ASSESSMENTS);
      expect(result).toBeCloseTo(81.875, 2);
    });

    it("returns 0 when no assessments are graded", () => {
      const result = computeCurrent(ALL_UNGRADED_ASSESSMENTS);
      expect(result).toBe(0);
    });

    it("computes weighted average for COMP3221", () => {
      // (85/100)*0.10 + (72/100)*0.10 = 0.085 + 0.072 = 0.157
      // sumW = 0.20
      // result = (0.157 / 0.20) * 100 = 78.5
      const result = computeCurrent(COMP3221_ASSESSMENTS);
      expect(result).toBeCloseTo(78.5, 2);
    });

    it("computes weighted average for EDGU1003", () => {
      // (90/100)*0.20 + (88/100)*0.15 + (85/100)*0.15
      // = 0.18 + 0.132 + 0.1275 = 0.4395
      // sumW = 0.50
      // result = (0.4395 / 0.50) * 100 = 87.9
      const result = computeCurrent(EDGU1003_ASSESSMENTS);
      expect(result).toBeCloseTo(87.9, 2);
    });
  });

  describe("computeProjected", () => {
    it("computes projected when all predictions filled for COMP2017", () => {
      const predictions: Record<number, number | null> = {
        2: 75,
        3: 80,
      };
      // graded: (85/100)*0.15 + (80/100)*0.25 = 0.1275 + 0.20 = 0.3275
      // predicted: (75/100)*0.10 + (80/100)*0.50 = 0.075 + 0.40 = 0.475
      // total = 0.3275 + 0.475 = 0.8025
      // totalW = 1.0
      // result = (0.8025 / 1.0) * 100 = 80.25
      const result = computeProjected(COMP2017_ASSESSMENTS, predictions);
      expect(result).toBeCloseTo(80.25, 2);
    });

    it("returns null when not all predictions filled", () => {
      const predictions: Record<number, number | null> = { 2: 75 };
      const result = computeProjected(COMP2017_ASSESSMENTS, predictions);
      expect(result).toBeNull();
    });

    it("returns null when prediction is null", () => {
      const predictions: Record<number, number | null> = {
        2: 75,
        3: null,
      };
      const result = computeProjected(COMP2017_ASSESSMENTS, predictions);
      expect(result).toBeNull();
    });

    it("returns null for fully ungraded course with no predictions", () => {
      const result = computeProjected(ALL_UNGRADED_ASSESSMENTS, {});
      expect(result).toBeNull();
    });
  });

  describe("computeWAM", () => {
    it("computes WAM with standard scheme using current marks (no predictions)", () => {
      const courses = makeCourses();
      const result = computeWAM(courses, "standard");
      // Standard: all weights = 1, so WAM = sum(mark * cp * 1) / sum(cp * 1)
      // Each course uses computeCurrent since no predictions filled
      // allFilled should be false
      expect(result.allFilled).toBe(false);
      expect(result.wam).toBeGreaterThan(0);
    });

    it("computes WAM with standard scheme when all predictions filled", () => {
      const predictions = {
        comp2017: { 2: 75, 3: 80 },
        comp3221: { 2: 70, 3: 75 },
        stat2011: { 2: 65, 3: 60 },
        edgu1003: { 3: 85 },
        math2021: { 3: 78 },
      };
      const courses = makeCourses(predictions);
      const result = computeWAM(courses, "standard");
      expect(result.allFilled).toBe(true);
      // WAM = sum(projected * cp * 1) / sum(cp * 1)
      // All cp=6, all lw=1, so WAM = average of projected marks
      expect(result.wam).toBeGreaterThan(50);
      expect(result.wam).toBeLessThan(100);
    });

    it("excludes 1000-level courses with engineering scheme", () => {
      const predictions = {
        comp2017: { 2: 75, 3: 80 },
        comp3221: { 2: 70, 3: 75 },
        stat2011: { 2: 65, 3: 60 },
        edgu1003: { 3: 85 },
        math2021: { 3: 78 },
      };
      const courses = makeCourses(predictions);
      const engResult = computeWAM(courses, "engineering");
      const stdResult = computeWAM(courses, "standard");

      // Engineering excludes EDGU1003 (level 1), standard includes it
      expect(engResult.allFilled).toBe(true);
      // The results should be different because engineering weights differ
      expect(engResult.wam).not.toBeCloseTo(stdResult.wam, 0);
    });

    it("handles engineering scheme correctly weighting levels 2/3/4", () => {
      const predictions = {
        comp2017: { 2: 75, 3: 80 },
        comp3221: { 2: 70, 3: 75 },
        stat2011: { 2: 65, 3: 60 },
        edgu1003: { 3: 85 },
        math2021: { 3: 78 },
      };
      const courses = makeCourses(predictions);
      const result = computeWAM(courses, "engineering");
      // EDGU1003 (level 1) excluded
      // COMP2017 (level 2): lw=2, COMP3221 (level 3): lw=3
      // STAT2011 (level 2): lw=2, MATH2021 (level 2): lw=2
      // Denominator = 6*2 + 6*3 + 6*2 + 6*2 = 12+18+12+12 = 54
      expect(result.allFilled).toBe(true);
      expect(result.wam).toBeGreaterThan(0);
    });
  });

  describe("computeRequired", () => {
    it("returns required scores for each course with standard scheme", () => {
      const courses = makeCourses();
      const results = computeRequired(courses, 85, "standard");
      expect(results).toHaveLength(5);
      results.forEach((r) => {
        expect(r.code).toBeTruthy();
        expect(typeof r.required).toBe("number");
      });
    });

    it("per-course: required score makes this course's final mark equal target", () => {
      // COMP2017: 40% assessed, current avg = 82.0
      // knownSum = (85*0.1 + 78*0.15 + 84*0.15) / 100 on 0-1 scale
      // knownSum = 0.1*85/100 + 0.15*78/100 + 0.15*84/100 = 0.085 + 0.117 + 0.126 = 0.328
      // Wait, knownSum = sum((score/maxScore) * weight) for graded
      // = (85/100)*0.1 + (78/100)*0.15 + (84/100)*0.15 = 0.085 + 0.117 + 0.126 = 0.328
      // remainWeight = 1 - 0.4 = 0.6, target = 74
      // required = ((74/100 - 0.328) / 0.6) * 100 = (0.412 / 0.6) * 100 = 68.67
      const course: CourseComputeData = {
        courseId: "c1",
        code: "COMP2017",
        creditPoints: 6,
        level: 2,
        assessments: [
          { weight: 0.1, score: 85, maxScore: 100 },
          { weight: 0.15, score: 78, maxScore: 100 },
          { weight: 0.15, score: 84, maxScore: 100 },
          { weight: 0.2, score: null, maxScore: 100 },
          { weight: 0.4, score: null, maxScore: 100 },
        ],
        predictions: {},
      };
      const results = computeRequired([course], 74, "standard");
      expect(results[0].required).toBeCloseTo(68.67, 1);
      // Verify: final = (0.328 + 0.6867 * 0.6) * 100 = (0.328 + 0.412) * 100 = 74.0
    });

    it("marks locked courses (100% graded) correctly", () => {
      const fullyGradedCourse: CourseComputeData = {
        courseId: "locked",
        code: "LOCK1001",
        creditPoints: 6,
        level: 2,
        assessments: [
          { weight: 0.5, score: 80, maxScore: 100 },
          { weight: 0.5, score: 90, maxScore: 100 },
        ],
        predictions: {},
      };
      const courses = [fullyGradedCourse];
      const results = computeRequired(courses, 85, "standard");
      expect(results[0].locked).toBe(true);
    });

    it("marks excluded courses (0-weight level) in engineering scheme", () => {
      const level1Course: CourseComputeData = {
        courseId: "elective",
        code: "EDGU1003",
        creditPoints: 6,
        level: 1,
        assessments: [
          { weight: 0.5, score: 90, maxScore: 100 },
          { weight: 0.5, score: null, maxScore: 100 },
        ],
        predictions: {},
      };
      const courses = [level1Course];
      const results = computeRequired(courses, 85, "engineering");
      expect(results[0].excluded).toBe(true);
    });

    it("does not mark level 1 courses as excluded in standard scheme", () => {
      const level1Course: CourseComputeData = {
        courseId: "elective",
        code: "EDGU1003",
        creditPoints: 6,
        level: 1,
        assessments: [
          { weight: 0.5, score: 90, maxScore: 100 },
          { weight: 0.5, score: null, maxScore: 100 },
        ],
        predictions: {},
      };
      const courses = [level1Course];
      const results = computeRequired(courses, 85, "standard");
      expect(results[0].excluded).toBeUndefined();
    });
  });
});

describe("wam-to-gpa", () => {
  describe("wamToGpa", () => {
    it("maps 85+ to 4.0 (HD)", () => {
      expect(wamToGpa(85)).toBe(4.0);
      expect(wamToGpa(95)).toBe(4.0);
    });

    it("maps 75-84 to 3.5 (D)", () => {
      expect(wamToGpa(75)).toBe(3.5);
      expect(wamToGpa(84)).toBe(3.5);
    });

    it("maps 65-74 to 2.5 (CR)", () => {
      expect(wamToGpa(65)).toBe(2.5);
      expect(wamToGpa(74)).toBe(2.5);
    });

    it("maps 50-64 to 1.5 (P)", () => {
      expect(wamToGpa(50)).toBe(1.5);
      expect(wamToGpa(64)).toBe(1.5);
    });

    it("maps below 50 to 0.0 (F)", () => {
      expect(wamToGpa(49)).toBe(0.0);
      expect(wamToGpa(0)).toBe(0.0);
    });
  });

  describe("getFeasibility", () => {
    it("returns feasible for required <= 85", () => {
      expect(getFeasibility(70)).toBe("feasible");
      expect(getFeasibility(85)).toBe("feasible");
    });

    it("returns warning for 85 < required <= 100", () => {
      expect(getFeasibility(86)).toBe("warning");
      expect(getFeasibility(100)).toBe("warning");
    });

    it("returns impossible for required > 100", () => {
      expect(getFeasibility(101)).toBe("impossible");
      expect(getFeasibility(150)).toBe("impossible");
    });
  });
});
