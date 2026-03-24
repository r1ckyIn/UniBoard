"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { withClientOnly } from "@/components/design-system/ClientOnly";

// SSR-safe RoughProgressBar
const RoughProgressBarClient = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);

interface CourseProgress {
  code: string;
  completedWeight: number;
  creditPoints: number;
  color: string;
}

interface SemesterProgressCardProps {
  courses: CourseProgress[];
}

/**
 * Semester progress right panel card.
 * Shows per-course assessed percentage with RoughProgressBar,
 * and an overall weighted-average progress at the bottom.
 */
export default function SemesterProgressCard({
  courses,
}: SemesterProgressCardProps) {
  const t = useTranslations("predict");

  const overallPct = useMemo(() => {
    let sumWeightedProgress = 0;
    let sumCp = 0;
    for (const c of courses) {
      sumWeightedProgress += c.completedWeight * c.creditPoints;
      sumCp += c.creditPoints;
    }
    return sumCp > 0 ? Math.round((sumWeightedProgress / sumCp) * 100) : 0;
  }, [courses]);

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      {/* Card title */}
      <div className="flex items-center gap-[7px] mb-[10px]">
        <BarChart3 size={16} className="text-[#d97757] flex-shrink-0" />
        <span className="text-[0.82rem] font-semibold">
          {t("progress.title")}
        </span>
      </div>

      {/* Per-course progress rows */}
      {courses.map((c) => (
        <div key={c.code} className="flex items-center gap-[8px] py-[6px]">
          {/* Code */}
          <span className="text-[0.74rem] font-semibold text-[#2d2d2a] min-w-[72px] flex-shrink-0">
            {c.code}
          </span>

          {/* Progress bar */}
          <div className="flex-1 min-w-0">
            <RoughProgressBarClient
              progress={c.completedWeight}
              color={c.color}
              width={120}
              height={12}
            />
          </div>

          {/* Percentage */}
          <span className="text-[0.68rem] font-medium text-[#9b9b94] min-w-[36px] text-right flex-shrink-0">
            {Math.round(c.completedWeight * 100)}%
          </span>
        </div>
      ))}

      {/* Overall progress */}
      <div className="text-[0.74rem] font-semibold text-[#6b6b65] text-center mt-[10px] pt-[8px] border-t border-[#eae7e0]">
        {t("progress.overall", { pct: String(overallPct) })}
      </div>
    </RoughCard>
  );
}
