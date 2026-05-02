"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { withClientOnly } from "@/components/design-system/ClientOnly";

const RoughProgressBarClient = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);

interface AssessmentRowProps {
  name: string;
  subtitle?: string;
  weight: number;
  dueDate?: string;
  score: number | null;
  maxScore: number;
  courseColor: string;
  courseSoft: string;
  prediction: number | null;
  onPredictionChange: (value: string) => void;
}

/**
 * A single row in the assessment table. Displays assessment name,
 * weight with progress bar, due date, and score (fixed or prediction input).
 */
const AssessmentRow = React.memo(function AssessmentRow({
  name,
  subtitle,
  weight,
  dueDate,
  score,
  maxScore,
  courseColor,
  courseSoft,
  prediction,
  onPredictionChange,
}: AssessmentRowProps) {
  const t = useTranslations("courseDetail");

  const formattedDate = dueDate
    ? format(new Date(dueDate), "d MMM")
    : t("assessment.variousDates");

  return (
    <tr className="transition-claude-fast hover:bg-[rgba(106,155,204,0.03)]">
      {/* Assessment name */}
      <td className="px-[10px] py-[14px] text-[0.84rem] text-[#6b6b65] align-middle border-b border-[#eae7e0]">
        <div className="assess-name font-semibold text-[#2d2d2a] text-[0.84rem]">
          {name}
        </div>
        {subtitle && (
          <div className="assess-sub text-[0.72rem] text-[#9b9b94] mt-[2px]">
            {subtitle}
          </div>
        )}
      </td>

      {/* Weight with progress bar */}
      <td className="px-[10px] py-[14px] text-center font-medium align-middle border-b border-[#eae7e0]">
        <RoughProgressBarClient
          progress={weight}
          color={courseColor}
          width={80}
          height={8}
        />
        <div className="text-[0.72rem] text-[#6b6b65] mt-[3px]">
          {Math.round(weight * 100)}%
        </div>
      </td>

      {/* Due date */}
      <td className="px-[10px] py-[14px] text-center text-[0.78rem] text-[#9b9b94] align-middle border-b border-[#eae7e0]">
        {formattedDate}
      </td>

      {/* Score cell */}
      <td className="px-[10px] py-[14px] text-center align-middle border-b border-[#eae7e0]">
        <div className="score-cell flex items-center justify-center gap-[2px]">
          {score !== null ? (
            <>
              <span
                className="assess-score font-serif font-bold text-[1.05rem]"
                style={{ color: courseColor }}
              >
                {score}
              </span>
              <span className="score-denominator font-serif font-semibold text-[0.88rem] text-[#9b9b94]">
                /{maxScore}
              </span>
              <span
                className="assess-graded-badge text-[0.6rem] font-semibold rounded-[4px] px-[7px] py-[2px] ml-[6px] align-middle"
                style={{ backgroundColor: courseSoft, color: courseColor }}
              >
                {t("assessment.gradedBadge")}
              </span>
            </>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="score-input w-[60px] border-0 border-b-2 border-dashed border-[#e8e5dd] bg-transparent font-serif font-bold text-[1.05rem] text-center outline-none px-[4px] py-[2px] transition-claude-fast focus:border-b-[var(--focus-color)]"
                style={
                  {
                    color: courseColor,
                    "--focus-color": courseColor,
                  } as React.CSSProperties
                }
                placeholder={t("assessment.scorePlaceholder")}
                value={prediction ?? ""}
                onChange={(e) => onPredictionChange(e.target.value)}
              />
              <span className="score-denominator font-serif font-semibold text-[0.88rem] text-[#9b9b94]">
                /{maxScore}
              </span>
            </>
          )}
        </div>
      </td>
    </tr>
  );
});

AssessmentRow.displayName = "AssessmentRow";

export default AssessmentRow;
