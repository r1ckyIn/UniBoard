import { describe, it, expect, beforeEach } from "vitest";
import { act } from "@testing-library/react";
import { usePredictorStore } from "@/lib/stores/predictor";
import { calculateCourseWAM, calculateWAM } from "@/lib/utils/gpa";

// Test the core prediction logic: Zustand store + WAM calculation
// This tests the "real-time client-side calculation" contract without rendering full components

describe("Predict: WAM calculation with Zustand store", () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    usePredictorStore.getState().clearScores();
  });

  it("store starts with empty overrides", () => {
    const state = usePredictorStore.getState();
    expect(state.overrides).toEqual({});
    expect(state.getOverridesAsArray()).toEqual([]);
  });

  it("setScore adds an override to the store", () => {
    act(() => {
      usePredictorStore.getState().setScore("assess-1", 85);
    });
    const state = usePredictorStore.getState();
    expect(state.overrides["assess-1"]).toBe(85);
  });

  it("clearScores resets all overrides", () => {
    act(() => {
      usePredictorStore.getState().setScore("assess-1", 85);
      usePredictorStore.getState().setScore("assess-2", 70);
      usePredictorStore.getState().clearScores();
    });
    expect(usePredictorStore.getState().overrides).toEqual({});
  });

  it("getOverridesAsArray returns correct format for API", () => {
    act(() => {
      usePredictorStore.getState().setScore("assess-1", 85);
      usePredictorStore.getState().setScore("assess-2", 70);
    });
    const arr = usePredictorStore.getState().getOverridesAsArray();
    expect(arr).toHaveLength(2);
    expect(arr).toContainEqual({
      assessment_id: "assess-1",
      hypothetical_score: 85,
    });
    expect(arr).toContainEqual({
      assessment_id: "assess-2",
      hypothetical_score: 70,
    });
  });

  it("calculates simulated course WAM with hypothetical scores from store", () => {
    // Scenario: course with 2 graded + 1 ungraded assessment
    const assessments = [
      { score: 80, max_score: 100, weight: 0.3 }, // graded
      { score: 90, max_score: 100, weight: 0.3 }, // graded
      { score: null, max_score: 100, weight: 0.4 }, // ungraded
    ];

    // Without hypothetical: WAM only from graded = (80*0.3 + 90*0.3) / 0.6 = 85
    expect(calculateCourseWAM(assessments)).toBeCloseTo(85, 1);

    // With hypothetical score of 70 for the ungraded assessment:
    const withHypothetical = assessments.map((a, i) =>
      i === 2 ? { ...a, hypothetical_score: 70 } : a
    );
    // (80*0.3 + 90*0.3 + 70*0.4) / (0.3+0.3+0.4) = (24+27+28)/1.0 = 79
    expect(calculateCourseWAM(withHypothetical)).toBeCloseTo(79, 1);
  });

  it("calculates overall WAM across multiple courses with different credit points", () => {
    // Simulate what ScenarioBuilder does: per-course WAM then overall WAM
    const courses = [
      { wam: 85, credit_points: 6 }, // COMP2017 simulated WAM
      { wam: 72, credit_points: 6 }, // DATA2002 simulated WAM
      { wam: 90, credit_points: 12 }, // MATH1005 simulated WAM (double credits)
    ];
    // (85*6 + 72*6 + 90*12) / (6+6+12) = (510+432+1080)/24 = 2022/24 = 84.25
    expect(calculateWAM(courses)).toBeCloseTo(84.25, 1);
  });

  it("scenarioName is managed independently from scores", () => {
    act(() => {
      usePredictorStore.getState().setScenarioName("Best Case");
      usePredictorStore.getState().setScore("assess-1", 100);
    });
    expect(usePredictorStore.getState().scenarioName).toBe("Best Case");
    expect(usePredictorStore.getState().overrides["assess-1"]).toBe(100);

    // clearScores also clears scenarioName
    act(() => {
      usePredictorStore.getState().clearScores();
    });
    expect(usePredictorStore.getState().scenarioName).toBe("");
    expect(usePredictorStore.getState().overrides).toEqual({});
  });

  it("loadScenario populates store from saved scenario data", () => {
    act(() => {
      usePredictorStore.getState().loadScenario("My Scenario", [
        { assessment_id: "a-1", hypothetical_score: 75 },
        { assessment_id: "a-2", hypothetical_score: 88 },
      ]);
    });

    const state = usePredictorStore.getState();
    expect(state.scenarioName).toBe("My Scenario");
    expect(state.overrides).toEqual({ "a-1": 75, "a-2": 88 });
  });

  it("handles edge case: all assessments ungraded with hypothetical scores", () => {
    const assessments = [
      { score: null, max_score: 100, weight: 0.5, hypothetical_score: 60 },
      { score: null, max_score: 100, weight: 0.5, hypothetical_score: 80 },
    ];
    // (60*0.5 + 80*0.5) / 1.0 = 70
    expect(calculateCourseWAM(assessments)).toBeCloseTo(70, 1);
  });

  it("handles edge case: no scores at all returns 0", () => {
    const assessments = [
      { score: null, max_score: 100, weight: 0.5 },
      { score: null, max_score: 100, weight: 0.5 },
    ];
    // No effective scores => 0
    expect(calculateCourseWAM(assessments)).toBe(0);
  });

  it("handles edge case: empty courses array returns 0", () => {
    expect(calculateWAM([])).toBe(0);
  });
});
