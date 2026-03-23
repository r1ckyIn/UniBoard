"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import rough from "roughjs";
import { useTranslations } from "next-intl";
import { GraduationCap, BookOpen } from "lucide-react";
import type { components } from "@/lib/api/types.gen";
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
 * Assessment section card: two-layer hand-drawn border, assessment table
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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawBorder = useCallback(() => {
    const el = containerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    svg.setAttribute("viewBox", `-4 -4 ${w + 8} ${h + 8}`);
    svg.replaceChildren();

    const rc = rough.svg(svg);
    const rect = rc.rectangle(0, 0, w, h, {
      stroke: "#d0cdc4",
      strokeWidth: 0.8,
      roughness: 1,
      bowing: 1,
      fill: "none",
      seed: 42,
    });
    svg.appendChild(rect);
  }, []);

  useEffect(() => {
    let innerRafId: number;
    const outerRafId = requestAnimationFrame(() => {
      innerRafId = requestAnimationFrame(() => {
        drawBorder();
      });
    });

    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => drawBorder());
    observer.observe(el);

    return () => {
      cancelAnimationFrame(outerRafId);
      cancelAnimationFrame(innerRafId);
      observer.disconnect();
    };
  }, [drawBorder]);

  // Compute grade metrics
  const { currentAvg, projectedFinal, assessedWeight } = useMemo(() => {
    let gradedSumSW = 0;
    let gradedSumW = 0;
    let totalSumSW = 0;
    let allFilled = true;

    assessments.forEach((a, i) => {
      if (a.score !== null) {
        gradedSumSW += a.score * a.weight;
        gradedSumW += a.weight;
        totalSumSW += a.score * a.weight;
      } else {
        const pred = predictions[i];
        if (pred !== null && pred !== undefined) {
          totalSumSW += (pred / a.max_score) * a.weight;
        } else {
          allFilled = false;
        }
      }
    });

    const totalWeight = assessments.reduce((s, a) => s + a.weight, 0);
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
      <div
        ref={containerRef}
        className="relative overflow-visible p-[10px]"
        style={{ background: "transparent" }}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
        />
        <div className="bg-[#f6f5f0] px-[22px] py-[26px]">
          <div className="flex flex-col items-center justify-center py-[32px] text-[#9b9b94]">
            <BookOpen size={24} className="mb-[8px]" />
            <span className="text-[0.84rem]">{t("empty.noAssessments")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-visible p-[10px]"
      style={{ background: "transparent" }}
    >
      {/* Hand-drawn border SVG */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
      />

      <div className="bg-[#f6f5f0] overflow-hidden">
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
                  status={a.status}
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
    </div>
  );
}
