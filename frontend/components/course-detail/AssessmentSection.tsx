"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, BookOpen } from "lucide-react";
import type { components } from "@/lib/api/types.gen";
import RoughCard from "@/components/design-system/RoughCard";
import AssessmentRow from "@/components/course-detail/AssessmentRow";
import GradeSummary from "@/components/course-detail/GradeSummary";

type AssessmentWeight = components["schemas"]["AssessmentWeight"];

interface AssessmentSectionProps {
  assessments: AssessmentWeight[];
  predictions: Record<number, number | null>;
  onPredictionChange: (index: number, value: string) => void;
  courseColor: string;
  courseSoft: string;
  semester: string;
}

/**
 * Assessment section card: RoughCard border, assessment table
 * with prediction inputs, and grade summary with animated projected final.
 */
export default function AssessmentSection({
  assessments,
  predictions,
  onPredictionChange,
  courseColor,
  courseSoft,
  semester,
}: AssessmentSectionProps) {
  const t = useTranslations("courseDetail");

  // Compute grade metrics
  const { currentAvg, projectedFinal, assessedWeight } = useMemo(() => {
    let gradedSumSW = 0;
    let gradedSumW = 0;
    let totalSumSW = 0;
    let totalWeight = 0;
    let allFilled = true;

    assessments.forEach((a, i) => {
      totalWeight += a.weight;
      if (a.score !== null) {
        const normalized = a.max_score > 0 ? a.score / a.max_score : 0;
        gradedSumSW += normalized * a.weight;
        gradedSumW += a.weight;
        totalSumSW += normalized * a.weight;
      } else {
        const pred = predictions[i];
        if (pred !== null && pred !== undefined) {
          totalSumSW += (a.max_score > 0 ? pred / a.max_score : 0) * a.weight;
        } else {
          allFilled = false;
        }
      }
    });
    const avg = gradedSumW > 0 ? (gradedSumSW / gradedSumW) * 100 : null;
    const projected =
      allFilled && totalWeight > 0
        ? (totalSumSW / totalWeight) * 100
        : null;

    return { currentAvg: avg, projectedFinal: projected, assessedWeight: gradedSumW };
  }, [assessments, predictions]);

  // Empty state
  if (assessments.length === 0) {
    return (
      <RoughCard disableHover padding="">
        <div className="px-[22px] py-[26px]">
          <div className="flex flex-col items-center justify-center py-[32px] text-[#9b9b94]">
            <BookOpen size={24} className="mb-[8px]" />
            <span className="text-[0.84rem]">{t("empty.noAssessments")}</span>
          </div>
        </div>
      </RoughCard>
    );
  }

  return (
    <RoughCard disableHover padding="">
      <div className="overflow-hidden">
        <div className="px-[26px] py-[22px]">
          {/* Card header */}
          <div className="flex items-center justify-between mb-[12px]">
            <div className="text-[0.92rem] font-semibold flex items-center gap-[8px]">
              <GraduationCap size={18} className="text-[#d97757]" />
              {t("assessment.title")}
            </div>
            <span className="text-[0.68rem] px-[9px] py-[3px] rounded-[6px] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757]">
              {semester}
            </span>
          </div>

          {/* Assessment table */}
          <table className="assess-table w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th
                  className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] px-[10px] py-[8px] text-left border-b-[1.5px] border-[#eae7e0]"
                  style={{ width: "40%" }}
                >
                  {t("assessment.columns.assessment")}
                </th>
                <th
                  className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] px-[10px] py-[8px] text-center border-b-[1.5px] border-[#eae7e0]"
                  style={{ width: "15%" }}
                >
                  {t("assessment.columns.weight")}
                </th>
                <th
                  className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] px-[10px] py-[8px] text-center border-b-[1.5px] border-[#eae7e0]"
                  style={{ width: "22%" }}
                >
                  {t("assessment.columns.due")}
                </th>
                <th
                  className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em] px-[10px] py-[8px] text-center border-b-[1.5px] border-[#eae7e0]"
                  style={{ width: "23%" }}
                >
                  {t("assessment.columns.score")}
                </th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a, i) => (
                <AssessmentRow
                  key={`${a.name}-${i}`}
                  name={a.name}
                  subtitle={a.group_name !== a.name ? a.group_name : undefined}
                  weight={a.weight}
                  dueDate={a.due_date}
                  score={a.score}
                  maxScore={a.max_score}
                  courseColor={courseColor}
                  courseSoft={courseSoft}
                  prediction={predictions[i] ?? null}
                  onPredictionChange={(value) => onPredictionChange(i, value)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Grade Summary */}
        <GradeSummary
          currentAvg={currentAvg}
          projectedFinal={projectedFinal}
          assessedWeight={assessedWeight}
          courseColor={courseColor}
        />
      </div>
    </RoughCard>
  );
}
