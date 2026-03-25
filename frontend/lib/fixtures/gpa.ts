import type { components } from "@/lib/api/types.gen";

type GpaReport = components["schemas"]["GpaReport"];
type GpaPrediction = components["schemas"]["GpaPrediction"];
type GpaPath = components["schemas"]["GpaPath"];

// ── GPA Report ──────────────────────────────────────────────────
export const gpaReport: GpaReport = {
  scale: "wam",
  current_wam: 78.5,
  current_gpa_4: 3.2,
  target_wam: 85.0,
  gap: -6.5,
  courses: [
    {
      course_id: "crs_comp2017",
      code: "COMP2017",
      name: "Systems Programming",
      credit_points: 6,
      level_weight: 2,
      current_mark: 100.0,
      grade_letter: "HD",
      completed_weight: 0.05,
    },
    {
      course_id: "crs_comp3221",
      code: "COMP3221",
      name: "Distributed Systems",
      credit_points: 6,
      level_weight: 3,
      current_mark: 65.6,
      grade_letter: "CR",
      completed_weight: 0.10,
    },
    {
      course_id: "crs_stat2011",
      code: "STAT2011",
      name: "Probability and Estimation Theory",
      credit_points: 6,
      level_weight: 2,
      current_mark: 0.0,
      grade_letter: "P",
      completed_weight: 0.05,
    },
    {
      course_id: "crs_edgu1003",
      code: "EDGU1003",
      name: "Diet, Nutrition and Lifestyle",
      credit_points: 6,
      level_weight: 1,
      current_mark: 57.1,
      grade_letter: "P",
      completed_weight: 0.05,
    },
    {
      course_id: "crs_math2021",
      code: "MATH2021",
      name: "Vector Calculus and Differential Equations",
      credit_points: 6,
      level_weight: 2,
      current_mark: 100.0,
      grade_letter: "HD",
      completed_weight: 0.02,
    },
  ],
  last_sync_at: "2026-03-20T08:00:00Z",
};

// ── GPA Prediction (what-if) ────────────────────────────────────
export const gpaPredictionDefault: GpaPrediction = {
  current_wam: 78.5,
  predicted_wam: 82.3,
  delta: 3.8,
  per_course: [
    {
      course_id: "crs_comp2017",
      code: "COMP2017",
      current_mark: 82.5,
      predicted_mark: 85.0,
      applied_assumptions: [
        {
          course_id: "crs_comp2017",
          assessment_name: "Assignment 3",
          assumed_score: 88,
        },
        {
          course_id: "crs_comp2017",
          assessment_name: "Final Exam",
          assumed_score: 82,
        },
      ],
    },
    {
      course_id: "crs_comp3221",
      code: "COMP3221",
      current_mark: 71.0,
      predicted_mark: 75.0,
      applied_assumptions: [
        {
          course_id: "crs_comp3221",
          assessment_name: "Project Milestone 2",
          assumed_score: 78,
        },
        {
          course_id: "crs_comp3221",
          assessment_name: "Final Exam",
          assumed_score: 76,
        },
      ],
    },
  ],
};

// ── GPA Path (target path) ──────────────────────────────────────
export const gpaPathDefault: GpaPath = {
  target_wam: 85.0,
  current_wam: 78.5,
  is_achievable: true,
  per_course: [
    {
      course_id: "crs_comp2017",
      code: "COMP2017",
      current_mark: 100.0,
      minimum_remaining_avg: 87.0,
      remaining_assessments: [
        {
          name: "Assignment 3",
          weight: 0.2,
          minimum_score: 85,
        },
        {
          name: "Final Exam",
          weight: 0.4,
          minimum_score: 88,
        },
      ],
      difficulty: "moderate",
    },
    {
      course_id: "crs_comp3221",
      code: "COMP3221",
      current_mark: 65.6,
      minimum_remaining_avg: 92.0,
      remaining_assessments: [
        {
          name: "Project Milestone 2",
          weight: 0.25,
          minimum_score: 90,
        },
        {
          name: "Final Exam",
          weight: 0.5,
          minimum_score: 93,
        },
      ],
      difficulty: "hard",
    },
    {
      course_id: "crs_stat2011",
      code: "STAT2011",
      current_mark: 0.0,
      minimum_remaining_avg: 95.0,
      remaining_assessments: [
        {
          name: "Final Exam",
          weight: 0.7,
          minimum_score: 95,
        },
      ],
      difficulty: "impossible",
    },
    {
      course_id: "crs_edgu1003",
      code: "EDGU1003",
      current_mark: 57.1,
      minimum_remaining_avg: 90.0,
      remaining_assessments: [
        {
          name: "Quiz 1",
          weight: 0.20,
          minimum_score: 90,
        },
        {
          name: "Quiz 2",
          weight: 0.20,
          minimum_score: 90,
        },
        {
          name: "Quiz 3",
          weight: 0.20,
          minimum_score: 90,
        },
        {
          name: "Dietary Analysis Report",
          weight: 0.35,
          minimum_score: 90,
        },
      ],
      difficulty: "hard",
    },
    {
      course_id: "crs_math2021",
      code: "MATH2021",
      current_mark: 100.0,
      minimum_remaining_avg: 60.0,
      remaining_assessments: [
        {
          name: "Assignment 1",
          weight: 0.06,
          minimum_score: 60,
        },
        {
          name: "Quiz 1",
          weight: 0.12,
          minimum_score: 60,
        },
        {
          name: "Assignment 2",
          weight: 0.06,
          minimum_score: 60,
        },
        {
          name: "Quiz 2",
          weight: 0.12,
          minimum_score: 60,
        },
        {
          name: "Final Exam",
          weight: 0.60,
          minimum_score: 60,
        },
      ],
      difficulty: "easy",
    },
  ],
};
