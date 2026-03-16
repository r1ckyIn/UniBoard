"use client";

import { Sliders } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import ScenarioBuilder from "@/components/predict/ScenarioBuilder";
import TargetPath from "@/components/predict/TargetPath";
import ScenarioList from "@/components/predict/ScenarioList";
import { useGPASummary } from "@/lib/hooks/useGPA";
import { gradeBand } from "@/lib/utils/gpa";

/**
 * Predict page: What-if GPA simulator with sliders, target path, and saved scenarios.
 * All WAM calculations on slider changes are purely client-side (no API round-trips).
 */
export default function PredictPage() {
  const { data: summary, isLoading, isError } = useGPASummary();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--radius-card)]"
            style={{ background: "var(--color-card-bg)" }}
          />
        ))}
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <RoughCard
        className="p-6 rounded-[var(--radius-card)] text-center"
        style={{ background: "var(--color-card-bg)" }}
      >
        <p style={{ color: "var(--color-orange)" }}>
          Failed to load GPA data. Please try again later.
        </p>
      </RoughCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1
          className="text-3xl mb-1"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Predict
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          Explore how your grades could change with the What-if simulator
        </p>
      </div>

      {/* Right-panel-style quick stats inline */}
      <div className="flex items-center gap-4">
        <RoughCard
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)]"
          style={{ background: "var(--color-card-bg)" }}
        >
          <Sliders size={18} style={{ color: "var(--color-orange)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
              Current WAM
            </p>
            <p className="text-lg font-semibold tabular-nums" style={{ fontFamily: "monospace" }}>
              {summary.cumulative_wam.toFixed(1)}
            </p>
          </div>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "var(--color-green-soft)",
              color: "var(--color-green)",
            }}
          >
            {gradeBand(summary.cumulative_wam)}
          </span>
        </RoughCard>

        <RoughCard
          className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)]"
          style={{ background: "var(--color-card-bg)" }}
        >
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
              Courses
            </p>
            <p className="text-lg font-semibold tabular-nums" style={{ fontFamily: "monospace" }}>
              {summary.course_count}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
              Credit Points
            </p>
            <p className="text-lg font-semibold tabular-nums" style={{ fontFamily: "monospace" }}>
              {summary.total_credit_points}
            </p>
          </div>
        </RoughCard>
      </div>

      {/* Scenario Builder (main simulator) */}
      <ScenarioBuilder summary={summary} />

      {/* Target Path */}
      <TargetPath />

      {/* Saved Scenarios */}
      <ScenarioList />
    </div>
  );
}
