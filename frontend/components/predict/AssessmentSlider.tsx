"use client";

import { useCallback } from "react";
import { usePredictorStore } from "@/lib/stores/predictor";
import type { AssessmentDetail } from "@/lib/api/types";

interface AssessmentSliderProps {
  assessment: AssessmentDetail;
}

/**
 * Per-assessment row with a range slider and number input for hypothetical scores.
 * Graded assessments (score !== null) render as locked read-only values.
 * Slider and number input stay synced via the Zustand predictor store.
 */
export default function AssessmentSlider({ assessment }: AssessmentSliderProps) {
  const override = usePredictorStore((s) => s.overrides[assessment.id]);
  const setScore = usePredictorStore((s) => s.setScore);

  const isGraded = assessment.score !== null;
  const displayScore = isGraded
    ? assessment.score!
    : override ?? 0;

  const weightPct = Math.round(assessment.weight * 100);

  const handleChange = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(assessment.max_score, value));
      setScore(assessment.id, clamped);
    },
    [assessment.id, assessment.max_score, setScore]
  );

  // Graded assessment: show locked score
  if (isGraded) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)] opacity-75">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate" style={{ color: "var(--color-text-1)" }}>
              {assessment.name}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: "var(--color-card-border)",
                color: "var(--color-text-3)",
              }}
            >
              {assessment.group_name}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
              {weightPct}%
            </span>
          </div>
        </div>
        <span
          className="text-sm font-medium tabular-nums w-[60px] text-right"
          style={{ color: "var(--color-green)", fontFamily: "monospace" }}
        >
          {assessment.score}/{assessment.max_score}
        </span>
      </div>
    );
  }

  // Ungraded assessment: show slider + number input
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius-sm)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm truncate" style={{ color: "var(--color-text-1)" }}>
            {assessment.name}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--color-card-border)",
              color: "var(--color-text-3)",
            }}
          >
            {assessment.group_name}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
            {weightPct}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={assessment.max_score}
          step={1}
          value={displayScore}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            accentColor: "var(--color-orange)",
            background: "var(--color-card-border)",
          }}
        />
      </div>
      <input
        type="number"
        min={0}
        max={assessment.max_score}
        value={displayScore}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-[60px] text-sm text-right px-2 py-1 rounded-[var(--radius-sm)]"
        style={{
          fontFamily: "monospace",
          border: "1px solid var(--color-card-border)",
          background: "var(--color-card-bg)",
          color: "var(--color-text-1)",
        }}
      />
    </div>
  );
}
