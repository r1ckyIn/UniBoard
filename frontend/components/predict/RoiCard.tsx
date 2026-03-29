"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQueries } from "@tanstack/react-query";
import { TrendingUp, Sparkles } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { roiOptions } from "@/hooks/use-roi";
import type { AssignmentROI } from "@/hooks/use-roi";

// ── Priority thresholds ────────────────────────────────────────────────────
const PRIORITY_HIGH = 2.0;
const PRIORITY_NORMAL = 1.0;
const MAX_ITEMS = 6;

interface CourseInfo {
  course_id: string;
  code: string;
  color: { base: string; soft: string };
}

interface RoiCardProps {
  courses: CourseInfo[];
}

interface RankedAssignment extends AssignmentROI {
  course_code: string;
  course_color: { base: string; soft: string };
  has_ai: boolean;
}

/**
 * ROI ranking card for the Predict page right panel.
 * Fetches ROI data per-course, merges assignments, ranks by roi_score DESC,
 * and displays the top priority items with visual indicators.
 */
export default function RoiCard({ courses }: RoiCardProps) {
  const t = useTranslations("predict");

  // Fetch ROI for each course in parallel
  const roiQueries = useQueries({
    queries: courses.map((c) => roiOptions.course(c.course_id)),
  });

  const isLoading = roiQueries.some((q) => q.isLoading);

  const cardHeader = (
    <div className="flex items-center gap-[7px] mb-[10px]">
      <TrendingUp size={16} className="text-[#d97757] flex-shrink-0" />
      <span className="text-[0.82rem] font-semibold">{t("roi_title")}</span>
    </div>
  );

  // Merge and rank all assignments across courses
  const updatedAts = roiQueries.map((q) => q.dataUpdatedAt).join(",");
  const rankedItems = useMemo<RankedAssignment[]>(() => {
    const items: RankedAssignment[] = [];

    courses.forEach((course, i) => {
      const data = roiQueries[i]?.data?.data;
      if (!data) return;

      for (const assignment of data.assignments) {
        // Skip already-graded assignments
        if (assignment.score != null) continue;

        items.push({
          ...assignment,
          course_code: course.code,
          course_color: course.color,
          has_ai: data.has_ai_estimates && assignment.difficulty_source === "ai_inference",
        });
      }
    });

    // Sort by roi_score DESC and take top N
    items.sort((a, b) => b.roi_score - a.roi_score);
    return items.slice(0, MAX_ITEMS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, updatedAts]);

  // Don't render card while loading or with no data
  if (isLoading) {
    return (
      <RoughCard disableHover padding="py-[22px] px-[20px]">
        {cardHeader}
        <div className="space-y-[8px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[32px] bg-[#eae7e0] rounded-[4px] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  if (rankedItems.length === 0) {
    return (
      <RoughCard disableHover padding="py-[22px] px-[20px]">
        {cardHeader}
        <div className="text-[0.72rem] text-[#9b9b94] text-center py-[12px]">
          {t("roi_empty")}
        </div>
      </RoughCard>
    );
  }

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      {cardHeader}

      {/* Ranked assignments */}
      {rankedItems.map((item, idx) => {
        const priority = getPriority(item.roi_score);

        return (
          <div
            key={`${item.course_code}-${item.assessment_name}-${idx}`}
            className="flex items-start gap-[8px] py-[7px] border-b border-[#eae7e0] last:border-b-0"
          >
            {/* Course color dot */}
            <div
              className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[4px]"
              style={{ backgroundColor: item.course_color.base }}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Assessment name + course code */}
              <div className="flex items-center gap-[6px]">
                <span className="text-[0.74rem] font-semibold text-[#2d2d2a] truncate">
                  {item.assessment_name}
                </span>
                {item.has_ai && (
                  <span className="inline-flex items-center gap-[2px] text-[0.58rem] font-medium text-[#b08968] bg-[rgba(176,137,104,0.1)] px-[5px] py-[1px] rounded-[3px] flex-shrink-0">
                    <Sparkles size={9} />
                    {t("roi_ai_badge")}
                  </span>
                )}
              </div>

              {/* Meta row: course code, weight, difficulty */}
              <div className="flex items-center gap-[8px] mt-[2px]">
                <span className="text-[0.64rem] font-medium text-[#6b6b65]">
                  {item.course_code}
                </span>
                <span className="text-[0.62rem] text-[#9b9b94]">
                  {t("roi_weight")}: {Math.round(item.weight * 100)}%
                </span>
                <span className="text-[0.62rem] text-[#9b9b94]">
                  {t("roi_difficulty")}: {renderDifficulty(item.difficulty)}
                </span>
              </div>
            </div>

            {/* ROI score + priority label */}
            <div className="flex flex-col items-end flex-shrink-0">
              <span
                className="font-serif text-[0.82rem] font-bold"
                style={{ color: priority.color }}
              >
                {item.roi_score.toFixed(1)}
              </span>
              <span
                className="text-[0.58rem] font-medium"
                style={{ color: priority.color }}
              >
                {t(priority.labelKey)}
              </span>
            </div>
          </div>
        );
      })}
    </RoughCard>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getPriority(roiScore: number): { color: string; labelKey: string } {
  if (roiScore > PRIORITY_HIGH) {
    return { color: "#788c5d", labelKey: "roi_focus" };
  }
  if (roiScore >= PRIORITY_NORMAL) {
    return { color: "#b08968", labelKey: "roi_normal" };
  }
  return { color: "#9b9b94", labelKey: "roi_low" };
}

/**
 * Render difficulty as a compact dot indicator (1-5).
 */
function renderDifficulty(difficulty: number): string {
  const filled = Math.round(difficulty);
  return "\u25CF".repeat(filled) + "\u25CB".repeat(5 - filled);
}
