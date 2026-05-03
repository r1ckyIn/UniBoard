"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import type { components } from "@/lib/api/types.gen";

type AssessmentWeight = components["schemas"]["AssessmentWeight"];

const RoughProgressBarClient = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);

interface PredictAssessmentTableProps {
  assessments: AssessmentWeight[];
  predictions: Record<number, number | null>;
  onPredictionChange: (index: number, value: string) => void;
  courseColor: string;
  courseSoft: string;
}

/**
 * 3-column assessment table for predict cards.
 * Columns: Assessment (50%) | Weight (20%) | Score (30%).
 * Graded assessments show a fixed score + badge.
 * Ungraded assessments show a dashed-underline numeric input.
 */
export default function PredictAssessmentTable({
  assessments,
  predictions,
  onPredictionChange,
  courseColor,
  courseSoft,
}: PredictAssessmentTableProps) {
  const t = useTranslations("predict");

  const handleInputChange = (index: number, raw: string) => {
    // Allow empty to clear prediction
    if (raw === "") {
      onPredictionChange(index, "");
      return;
    }

    // Allow trailing dot/decimal during typing (e.g. "85." or "85.5")
    if (/^\d+\.?\d*$/.test(raw)) {
      const num = parseFloat(raw);
      if (Number.isNaN(num)) return;
      const clamped = Math.max(0, Math.min(100, num));
      // Preserve raw string if user is still typing decimals
      onPredictionChange(index, raw.endsWith(".") ? raw : String(clamped));
    }
  };

  return (
    <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
      <thead>
        <tr>
          <th
            className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] py-[8px] px-[10px] text-left border-b-[1.5px] border-[#eae7e0]"
            style={{ width: "50%" }}
          >
            {t("columns.assessment")}
          </th>
          <th
            className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] py-[8px] px-[10px] text-center border-b-[1.5px] border-[#eae7e0]"
            style={{ width: "20%" }}
          >
            {t("columns.weight")}
          </th>
          <th
            className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] py-[8px] px-[10px] text-center border-b-[1.5px] border-[#eae7e0]"
            style={{ width: "30%" }}
          >
            {t("columns.score")}
          </th>
        </tr>
      </thead>
      <tbody>
        {assessments.map((a, i) => {
          const isLast = i === assessments.length - 1;

          return (
            <tr
              key={`${a.name}-${i}`}
              className="transition-claude-fast hover:bg-[rgba(0,0,0,0.015)]"
            >
              {/* Assessment name */}
              <td
                className={`py-[12px] px-[10px] text-[0.84rem] text-[#6b6b65] align-middle ${isLast ? "" : "border-b border-[#eae7e0]"}`}
              >
                <div className="font-semibold text-[#2d2d2a] text-[0.84rem]">
                  {a.name}
                </div>
              </td>

              {/* Weight with progress bar */}
              <td
                className={`py-[12px] px-[10px] font-medium align-middle ${isLast ? "" : "border-b border-[#eae7e0]"}`}
              >
                <div className="flex items-center justify-center gap-[8px]">
                  <RoughProgressBarClient
                    progress={a.weight}
                    color={courseColor}
                    width={100}
                    height={10}
                  />
                  <span className="text-[0.72rem] text-[#6b6b65] min-w-[28px] text-right">
                    {Math.round(a.weight * 100)}%
                  </span>
                </div>
              </td>

              {/* Score cell */}
              <td
                className={`py-[12px] px-[10px] text-center align-middle ${isLast ? "" : "border-b border-[#eae7e0]"}`}
              >
                <div className="flex items-center justify-center gap-[2px]">
                  {a.score !== null ? (
                    <>
                      <span
                        className="font-serif font-bold text-[1.05rem]"
                        style={{ color: courseColor }}
                      >
                        {a.score}
                      </span>
                      <span className="font-serif font-semibold text-[0.88rem] text-[#9b9b94]">
                        /{a.max_score}
                      </span>
                      <span
                        className="text-[0.6rem] font-semibold rounded-[4px] px-[7px] py-[2px] ml-[6px] align-middle"
                        style={{
                          backgroundColor: courseSoft,
                          color: courseColor,
                        }}
                        data-testid="graded-badge"
                      >
                        {t("gradedBadge")}
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        className="score-input w-[56px] border-0 border-b-2 border-dashed border-[#d0cdc4] bg-transparent font-serif font-bold text-[1.05rem] text-center outline-none px-[4px] py-[2px] transition-claude-fast focus:border-b-current"
                        style={
                          {
                            color: courseColor,
                          } as React.CSSProperties
                        }
                        placeholder={t("scorePlaceholder")}
                        value={
                          predictions[i] !== null &&
                          predictions[i] !== undefined
                            ? String(predictions[i])
                            : ""
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleInputChange(i, e.target.value)
                        }
                        data-testid={`score-input-${i}`}
                      />
                      <span className="font-serif font-semibold text-[0.88rem] text-[#9b9b94]">
                        /{a.max_score}
                      </span>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
