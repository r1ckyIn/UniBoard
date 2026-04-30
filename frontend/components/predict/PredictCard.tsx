"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Lock } from "lucide-react";
import type { components } from "@/lib/api/types.gen";
import type { MouseEvent } from "react";
import { computeCurrent, computeProjected } from "@/lib/predict/wam-engine";
import { getGradeBand } from "@/lib/utils/grade-band";
import { getLevelFromCode } from "@/lib/predict/faculty-weights";
import PredictAssessmentTable from "@/components/predict/PredictAssessmentTable";
import PredictGradeSummary from "@/components/predict/PredictGradeSummary";

type GpaCourseSummary = components["schemas"]["GpaCourseSummary"];
type AssessmentWeight = components["schemas"]["AssessmentWeight"];

interface PredictCardProps {
  course: GpaCourseSummary;
  assessments: AssessmentWeight[];
  predictions: Record<number, number | null>;
  onPredictionChange: (index: number, value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  courseColor: { base: string; soft: string };
  excluded?: boolean;
}

/**
 * Color for mark values based on grade threshold.
 */
function getMarkColor(mark: number | null, courseColor: string): string {
  if (mark === null) return "#9b9b94";
  if (mark >= 75) return courseColor;
  if (mark >= 65) return "#b08968";
  if (mark >= 50) return "#6b6b65";
  return "#d97757";
}

/**
 * Expandable course prediction card shell.
 * Header shows course info, marks, grade badge, and chevron.
 * Expanded section shows assessment table and grade summary.
 */
export default function PredictCard({
  course,
  assessments,
  predictions,
  onPredictionChange,
  isExpanded,
  onToggle,
  courseColor,
  excluded = false,
}: PredictCardProps) {
  const t = useTranslations("predict");

  // Compute grade metrics
  const { currentAvg, projectedFinal, assessedWeight } = useMemo(() => {
    const engineAssessments = assessments.map((a) => ({
      weight: a.weight,
      score: a.score,
      maxScore: a.max_score,
    }));

    const current = computeCurrent(engineAssessments);
    const projected = computeProjected(engineAssessments, predictions);

    // Sum of graded assessment weights (0-1 scale)
    let gradedW = 0;
    for (const a of assessments) {
      if (a.score !== null) {
        gradedW += a.weight;
      }
    }

    return {
      currentAvg: gradedW > 0 ? current : null,
      projectedFinal: projected,
      assessedWeight: gradedW,
    };
  }, [assessments, predictions]);

  const level = getLevelFromCode(course.code);
  const gradeLabel = getGradeBand(projectedFinal ?? currentAvg);
  const assessedPct = Math.round(assessedWeight * 100);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (excluded) return;
    const target = e.target as HTMLElement;
    if (target.closest(".score-input") || target.closest("input")) {
      return;
    }
    onToggle();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative ${excluded ? "cursor-not-allowed opacity-45" : isExpanded ? "cursor-default" : "cursor-pointer"}`}
      data-testid="predict-card"
    >
      <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)] overflow-hidden relative hover:shadow-[0_2px_8px_rgba(20,20,19,0.06),0_8px_24px_rgba(20,20,19,0.04)] transition-shadow duration-200">
        {/* Left color stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] z-[3] pointer-events-none"
          style={{ backgroundColor: courseColor.base }}
          data-testid="color-stripe"
        />

        {/* Header (always visible) */}
        <div className="p-[16px_20px_16px_24px] flex items-center gap-[14px] min-w-0">
          {/* Color dot */}
          <div
            className="w-[10px] h-[10px] rounded-full flex-shrink-0"
            style={{ backgroundColor: courseColor.base }}
          />

          {/* Course info */}
          <div className="flex-1 min-w-0">
            <div className="font-serif font-semibold text-[0.95rem] text-[#2d2d2a] leading-[1.3]">
              {course.code}
            </div>
            <div className="text-[0.72rem] text-[#9b9b94] mt-[1px] whitespace-nowrap overflow-hidden text-ellipsis">
              {t("courseSubtitle", {
                name: course.name,
                level,
                cp: course.credit_points,
              })}
            </div>
          </div>

          {/* Right side stats — assessed, marks, grade, chevron */}
          <div className="flex items-center flex-shrink-0">
            {/* Assessed badge — fixed width for column alignment */}
            <div className="w-[90px] flex justify-center">
              <span
                className="text-[0.64rem] font-semibold py-[2px] px-[8px] rounded-[5px] whitespace-nowrap"
                style={{
                  backgroundColor: courseColor.soft,
                  color: courseColor.base,
                }}
              >
                {t("assessed", { pct: String(assessedPct) })}
              </span>
            </div>

            {/* Current mark — fixed width for column alignment */}
            <div className="w-[72px] flex flex-col items-center">
              <span className="text-[0.6rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
                {t("current")}
              </span>
              <span
                className="font-serif text-[1.1rem] font-bold leading-[1.2]"
                style={{
                  color: getMarkColor(currentAvg, courseColor.base),
                }}
              >
                {currentAvg !== null
                  ? `${currentAvg.toFixed(1)}%`
                  : "\u2014"}
              </span>
            </div>

            {/* Projected mark — fixed width for column alignment */}
            <div className="w-[72px] flex flex-col items-center">
              <span className="text-[0.6rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
                {t("projected")}
              </span>
              <span
                className="font-serif text-[1.1rem] font-bold leading-[1.2]"
                style={{
                  color: getMarkColor(projectedFinal, courseColor.base),
                }}
              >
                {projectedFinal !== null
                  ? `${projectedFinal.toFixed(1)}%`
                  : "\u2014"}
              </span>
            </div>

            {/* Grade badge — fixed width for column alignment */}
            <div className="w-[48px] flex justify-center">
              <span
                className="text-[0.62rem] font-bold py-[2px] px-[8px] rounded-[4px] whitespace-nowrap"
                style={{
                  backgroundColor: courseColor.soft,
                  color: courseColor.base,
                }}
                data-testid="grade-badge"
              >
                {gradeLabel}
              </span>
            </div>

            {/* Chevron */}
            <div className="w-[28px] flex justify-center">
              {excluded ? (
                <Lock size={14} className="text-[#9b9b94]" data-testid="lock-icon" />
              ) : (
                <ChevronDown
                  size={16}
                  className="text-[#9b9b94] transition-transform duration-300"
                  style={{
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  data-testid="chevron"
                />
              )}
            </div>
          </div>
        </div>

        {/* Expanded section */}
        <div
          className="overflow-hidden transition-[max-height] [transition-duration:var(--motion-slow)] [transition-timing-function:var(--ease-claude-out)]"
          style={{
            maxHeight: isExpanded ? "800px" : "0",
            transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
          }}
          data-testid="expanded-section"
        >
          <div className="px-[20px] pb-[20px] pl-[24px]">
            <PredictAssessmentTable
              assessments={assessments}
              predictions={predictions}
              onPredictionChange={onPredictionChange}
              courseColor={courseColor.base}
              courseSoft={courseColor.soft}
            />
            <PredictGradeSummary
              currentAvg={currentAvg}
              projectedFinal={projectedFinal}
              assessedWeight={assessedWeight}
              courseColor={courseColor.base}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
