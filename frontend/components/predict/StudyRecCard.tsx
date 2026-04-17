/**
 * Top-3 study recommendations card on the Predict page right rail (AIFEAT-01 / D-A1).
 *
 * Mirrors RoiCard.tsx visual: course color dot + assessment name + course code
 * + weight pill + days-until-due badge. Consumes the Top-3 slice from the cached
 * /ai/study-recommendations response (daily, AEST 07:00).
 */
"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import RoughCard from "@/components/design-system/RoughCard";
import { getCourseColor } from "@/lib/dashboard/course-colors";

export interface StudyRecItem {
  course_code: string;
  assessment_name: string;
  weight: number;
  days_until_due: number;
  roi_score: number;
  score: number;
}

interface StudyRecCardProps {
  items: StudyRecItem[];
  isLoading?: boolean;
}

export default function StudyRecCard({
  items,
  isLoading = false,
}: StudyRecCardProps) {
  const t = useTranslations("predict.studyRec");

  const header = (
    <div className="flex items-center gap-[7px] mb-[10px]">
      <Sparkles size={16} className="text-[#d97757] flex-shrink-0" />
      <span className="text-[0.82rem] font-semibold text-[#2d2d2a]">
        {t("title")}
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <RoughCard disableHover padding="py-[22px] px-[20px]">
        {header}
        <div className="space-y-[8px]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[32px] bg-[#eae7e0] rounded-[4px] animate-pulse"
            />
          ))}
        </div>
      </RoughCard>
    );
  }

  if (items.length === 0) {
    return (
      <RoughCard disableHover padding="py-[22px] px-[20px]">
        {header}
        <div className="text-[0.72rem] text-[#9b9b94] text-center py-[8px]">
          {t("empty")}
        </div>
      </RoughCard>
    );
  }

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      {header}
      {items.slice(0, 3).map((item, idx) => {
        const color = getCourseColor(item.course_code);
        const days = Math.max(0, Math.round(item.days_until_due));
        return (
          <div
            key={`${item.course_code}-${item.assessment_name}-${idx}`}
            className="flex items-start gap-[8px] py-[7px] border-b border-[#eae7e0] last:border-b-0"
          >
            <div
              className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[4px]"
              style={{ backgroundColor: color.base }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[0.74rem] font-semibold text-[#2d2d2a] truncate">
                {item.assessment_name}
              </div>
              <div className="flex items-center gap-[8px] mt-[2px] flex-wrap">
                <span className="text-[0.64rem] font-medium text-[#6b6b65]">
                  {item.course_code}
                </span>
                <span className="text-[0.62rem] text-[#9b9b94]">
                  {t("weight", { pct: Math.round(item.weight * 100) })}
                </span>
                <span className="text-[0.62rem] text-[#9b9b94]">
                  {t("daysLeft", { days })}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </RoughCard>
  );
}
