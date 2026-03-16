import { describe, it, expect } from "vitest";
import { calculateWAM, calculateCourseWAM, gradeBand } from "@/lib/utils/gpa";

describe("calculateWAM", () => {
  it("calculates weighted average correctly for multiple courses", () => {
    const courses = [
      { wam: 85, credit_points: 6 },
      { wam: 75, credit_points: 6 },
      { wam: 90, credit_points: 6 },
    ];
    // (85*6 + 75*6 + 90*6) / (6+6+6) = 1500/18 = 83.33...
    expect(calculateWAM(courses)).toBeCloseTo(83.33, 1);
  });

  it("returns 0 for empty array", () => {
    expect(calculateWAM([])).toBe(0);
  });

  it("handles single course", () => {
    expect(calculateWAM([{ wam: 92, credit_points: 6 }])).toBe(92);
  });

  it("weights courses by credit points", () => {
    const courses = [
      { wam: 100, credit_points: 12 },
      { wam: 50, credit_points: 6 },
    ];
    // (100*12 + 50*6) / (12+6) = 1500/18 = 83.33
    expect(calculateWAM(courses)).toBeCloseTo(83.33, 1);
  });

  it("returns 0 when total credits are 0", () => {
    expect(calculateWAM([{ wam: 80, credit_points: 0 }])).toBe(0);
  });
});

describe("calculateCourseWAM", () => {
  it("calculates from graded assessments", () => {
    const assessments = [
      { score: 80, max_score: 100, weight: 0.3 },
      { score: 90, max_score: 100, weight: 0.2 },
    ];
    // (80*0.3 + 90*0.2) / (0.3+0.2) = 42/0.5 = 84
    expect(calculateCourseWAM(assessments)).toBeCloseTo(84, 1);
  });

  it("skips null scores without hypothetical", () => {
    const assessments = [
      { score: 80, max_score: 100, weight: 0.5 },
      { score: null, max_score: 100, weight: 0.5 },
    ];
    // Only graded: 80*0.5 / 0.5 = 80
    expect(calculateCourseWAM(assessments)).toBeCloseTo(80, 1);
  });

  it("uses hypothetical_score when score is null", () => {
    const assessments = [
      { score: 80, max_score: 100, weight: 0.5 },
      { score: null, max_score: 100, weight: 0.5, hypothetical_score: 70 },
    ];
    // (80*0.5 + 70*0.5) / (0.5+0.5) = 75
    expect(calculateCourseWAM(assessments)).toBeCloseTo(75, 1);
  });

  it("returns 0 when all scores are null and no hypothetical", () => {
    const assessments = [
      { score: null, max_score: 100, weight: 0.5 },
      { score: null, max_score: 100, weight: 0.5 },
    ];
    expect(calculateCourseWAM(assessments)).toBe(0);
  });

  it("handles max_score not equal to 100", () => {
    const assessments = [
      { score: 45, max_score: 50, weight: 0.4 },
      { score: 18, max_score: 20, weight: 0.6 },
    ];
    // (90*0.4 + 90*0.6) / (0.4+0.6) = 90
    expect(calculateCourseWAM(assessments)).toBeCloseTo(90, 1);
  });
});

describe("gradeBand", () => {
  it("returns HD for >= 85", () => {
    expect(gradeBand(85)).toBe("HD");
    expect(gradeBand(100)).toBe("HD");
  });

  it("returns D for >= 75 < 85", () => {
    expect(gradeBand(75)).toBe("D");
    expect(gradeBand(84.9)).toBe("D");
  });

  it("returns CR for >= 65 < 75", () => {
    expect(gradeBand(65)).toBe("CR");
    expect(gradeBand(74.9)).toBe("CR");
  });

  it("returns P for >= 50 < 65", () => {
    expect(gradeBand(50)).toBe("P");
    expect(gradeBand(64.9)).toBe("P");
  });

  it("returns F for < 50", () => {
    expect(gradeBand(49.9)).toBe("F");
    expect(gradeBand(0)).toBe("F");
  });
});
