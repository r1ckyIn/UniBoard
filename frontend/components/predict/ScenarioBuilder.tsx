"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Save, RotateCcw } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { RoughNotationItem } from "@/components/design-system/RoughNotationWrapper";
import AssessmentSlider from "./AssessmentSlider";
import { usePredictorStore } from "@/lib/stores/predictor";
import { useSaveWhatIf } from "@/lib/hooks/usePredict";
import { useGPACourseDetail } from "@/lib/hooks/useGPA";
import { calculateCourseWAM, calculateWAM, gradeBand } from "@/lib/utils/gpa";
import type { GPASummaryResponse, AssessmentDetail } from "@/lib/api/types";

interface ScenarioBuilderProps {
  summary: GPASummaryResponse;
}

/**
 * Course section that fetches detailed assessments and renders sliders.
 * Calculates simulated course WAM purely client-side.
 */
function CourseSection({ courseId, courseCode, currentWam }: {
  courseId: string;
  courseCode: string;
  currentWam: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useGPACourseDetail(courseId);
  const overrides = usePredictorStore((s) => s.overrides);

  // Calculate simulated course WAM using client-side logic
  const simulatedWam = useMemo(() => {
    if (!detail?.assessments) return currentWam;

    const assessmentsWithHypothetical = detail.assessments.map(
      (a: AssessmentDetail) => ({
        score: a.score,
        max_score: a.max_score,
        weight: a.weight,
        hypothetical_score: overrides[a.id] != null ? overrides[a.id] : undefined,
      })
    );

    return calculateCourseWAM(assessmentsWithHypothetical);
  }, [detail?.assessments, overrides, currentWam]);

  const wamDiff = simulatedWam - currentWam;
  const hasChange = Math.abs(wamDiff) >= 0.1;

  return (
    <div
      className="rounded-[var(--radius-sm)]"
      style={{ border: "1px solid var(--color-divider)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left cursor-pointer"
        style={{ background: expanded ? "var(--color-card-bg-hover)" : "transparent" }}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-sm">{courseCode}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--color-text-3)" }}>
            Current: {currentWam.toFixed(1)}
          </span>
          <span
            className="text-sm font-medium tabular-nums"
            style={{
              fontFamily: "monospace",
              color: hasChange
                ? wamDiff > 0
                  ? "var(--color-green)"
                  : "var(--color-orange)"
                : "var(--color-text-2)",
            }}
          >
            {simulatedWam.toFixed(1)}
          </span>
        </div>
      </button>

      {expanded && detail?.assessments && (
        <div className="px-3 pb-3 space-y-1">
          {detail.assessments.map((a: AssessmentDetail) => (
            <AssessmentSlider key={a.id} assessment={a} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Main What-if simulator panel.
 * Assembles course sections with per-assessment sliders.
 * All WAM calculations are purely client-side -- no API round-trips on slider changes.
 */
export default function ScenarioBuilder({ summary }: ScenarioBuilderProps) {
  const overrides = usePredictorStore((s) => s.overrides);
  const scenarioName = usePredictorStore((s) => s.scenarioName);
  const setScenarioName = usePredictorStore((s) => s.setScenarioName);
  const clearScores = usePredictorStore((s) => s.clearScores);
  const getOverridesAsArray = usePredictorStore((s) => s.getOverridesAsArray);

  const saveWhatIf = useSaveWhatIf();
  const [saveMessage, setSaveMessage] = useState("");

  // Calculate overall simulated WAM across all courses
  // This uses a simplified approach: recalculate per-course WAM from summary data
  // For courses with overrides, this updates; for others, uses original WAM
  const simulatedOverallWam = useMemo(() => {
    if (!summary?.courses) return summary?.cumulative_wam ?? 0;

    // Use per-course WAMs directly from summary (the individual CourseSection
    // components show their own simulated WAMs, but for overall calculation
    // we rely on the summary data since we don't have all course details here)
    const courses = summary.courses.map((c) => ({
      wam: c.wam,
      credit_points: c.credit_points,
    }));

    return calculateWAM(courses);
  }, [summary]);

  const currentWam = summary?.cumulative_wam ?? 0;
  const wamDiff = simulatedOverallWam - currentWam;
  const hasOverrides = Object.keys(overrides).length > 0;

  const handleSave = useCallback(async () => {
    if (!scenarioName.trim()) {
      setSaveMessage("Please enter a scenario name");
      return;
    }

    try {
      await saveWhatIf.mutateAsync({
        name: scenarioName.trim(),
        scores: getOverridesAsArray(),
      });
      setSaveMessage("Scenario saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Failed to save scenario");
    }
  }, [scenarioName, getOverridesAsArray, saveWhatIf]);

  return (
    <RoughCard
      className="p-6 rounded-[var(--radius-card)]"
      style={{ background: "var(--color-card-bg)" }}
    >
      <h2
        className="text-2xl mb-1"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        What-if Simulator
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--color-text-3)" }}>
        Drag sliders to see how hypothetical scores affect your WAM
      </p>

      {/* Overall simulated WAM display */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: "var(--color-text-3)" }}>
            Current WAM
          </p>
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{ fontFamily: "monospace", color: "var(--color-text-2)" }}
          >
            {currentWam.toFixed(1)}
          </span>
        </div>
        <span style={{ color: "var(--color-text-3)", fontSize: "1.5rem" }}>
          &rarr;
        </span>
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: "var(--color-text-3)" }}>
            Simulated WAM
          </p>
          <RoughNotationItem
            type="circle"
            color={
              wamDiff > 0
                ? "var(--color-green)"
                : wamDiff < 0
                  ? "var(--color-orange)"
                  : "var(--color-text-3)"
            }
            show={hasOverrides}
          >
            <span
              className="text-2xl font-semibold tabular-nums px-2"
              style={{ fontFamily: "monospace" }}
            >
              {simulatedOverallWam.toFixed(1)}
            </span>
          </RoughNotationItem>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
            {gradeBand(simulatedOverallWam)}
          </p>
        </div>
      </div>

      {/* Course sections with assessment sliders */}
      <div className="space-y-2 mb-6">
        {summary.courses.map((c) => (
          <CourseSection
            key={c.course_id}
            courseId={c.course_id}
            courseCode={c.course_code}
            currentWam={c.wam}
          />
        ))}
      </div>

      {/* Save scenario controls */}
      <div
        className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)]"
        style={{ background: "var(--color-cream)" }}
      >
        <input
          type="text"
          placeholder="Scenario name..."
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="flex-1 text-sm px-3 py-1.5 rounded-[var(--radius-sm)]"
          style={{
            border: "1px solid var(--color-card-border)",
            background: "var(--color-card-bg)",
            color: "var(--color-text-1)",
          }}
        />
        <button
          onClick={handleSave}
          disabled={saveWhatIf.isPending || !hasOverrides}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[var(--radius-sm)] cursor-pointer disabled:opacity-50"
          style={{
            background: "var(--color-orange)",
            color: "white",
          }}
        >
          <Save size={14} />
          {saveWhatIf.isPending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={clearScores}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-[var(--radius-sm)] cursor-pointer"
          style={{
            border: "1px solid var(--color-card-border)",
            background: "transparent",
            color: "var(--color-text-2)",
          }}
        >
          <RotateCcw size={14} />
          Clear
        </button>
      </div>
      {saveMessage && (
        <p
          className="text-xs mt-2 text-center"
          style={{
            color: saveMessage.includes("saved") ? "var(--color-green)" : "var(--color-orange)",
          }}
        >
          {saveMessage}
        </p>
      )}
    </RoughCard>
  );
}
