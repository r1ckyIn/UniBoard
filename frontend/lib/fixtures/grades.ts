import type { components } from "@/lib/api/types.gen";

type Grade = components["schemas"]["Grade"];

// ── Grades by course id (synced with courses.ts graded assessments) ──
export const gradesByCourse: Record<string, Grade[]> = {
  crs_comp2017: [
    {
      id: "grd_comp2017_t0",
      assessment_name: "T0 (EFT)",
      score: 100,
      max_score: 100,
      weight: 0.05,
      group_name: "Tasks",
      graded_at: "2026-03-18T12:00:00Z",
      submitted_at: "2026-03-15T10:00:00Z",
    },
  ],
  crs_comp3221: [
    {
      id: "grd_comp3221_tq",
      assessment_name: "Tutorial Quizzes",
      score: 65.6,
      max_score: 100,
      weight: 0.10,
      group_name: "Quizzes",
      graded_at: "2026-03-22T12:00:00Z",
      submitted_at: "2026-03-22T10:00:00Z",
    },
  ],
  crs_stat2011: [
    {
      id: "grd_stat2011_eft",
      assessment_name: "EFT",
      score: 0,
      max_score: 100,
      weight: 0.05,
      group_name: "Tasks",
      graded_at: "2026-03-18T12:00:00Z",
      submitted_at: "2026-03-15T10:00:00Z",
    },
  ],
  crs_edgu1003: [
    {
      id: "grd_edgu1003_eft",
      assessment_name: "EFT Quiz",
      score: 57.1,
      max_score: 100,
      weight: 0.05,
      group_name: "Tasks",
      graded_at: "2026-03-18T12:00:00Z",
      submitted_at: "2026-03-15T10:00:00Z",
    },
  ],
  crs_math2021: [
    {
      id: "grd_math2021_eft",
      assessment_name: "EFT",
      score: 100,
      max_score: 100,
      weight: 0.02,
      group_name: "Tasks",
      graded_at: "2026-03-18T12:00:00Z",
      submitted_at: "2026-03-15T10:00:00Z",
    },
  ],
};
