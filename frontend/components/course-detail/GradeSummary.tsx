"use client";

import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { getGradeBand } from "@/lib/utils/grade-band";

interface GradeSummaryProps {
  currentAvg: number | null;
  projectedFinal: number | null;
  assessedWeight: number;
  courseColor: string;
}

/**
 * Grade summary bar showing current average, projected final (animated),
 * and a note about prediction behaviour. Rendered inside the assessment
 * section card.
 */
export default function GradeSummary({
  currentAvg,
  projectedFinal,
  assessedWeight,
  courseColor,
}: GradeSummaryProps) {
  const t = useTranslations("courseDetail");
  const displayValue = useCountUp(projectedFinal);

  return (
    <div className="grade-summary border-t border-[#eae7e0]">
      <div className="grade-summary-inner bg-[#f6f5f0] px-[26px] py-[18px] flex items-center justify-between gap-[24px]">
        {/* Current Average */}
        <div className="flex flex-col items-center gap-[2px]">
          <span className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
            {t("gradeSummary.currentAverage")}
          </span>
          <span
            className="font-serif text-[1.6rem] font-bold leading-[1.1]"
            style={{ color: courseColor }}
          >
            {currentAvg !== null ? `${currentAvg.toFixed(1)}%` : "\u2014"}
          </span>
          <span className="text-[0.72rem] text-[#6b6b65] font-medium">
            {t("gradeSummary.basedOnAssessed", {
              weight: Math.round(assessedWeight * 100),
            })}
          </span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-[50px] bg-[#eae7e0] flex-shrink-0" />

        {/* Projected Final */}
        <div className="flex flex-col items-center gap-[2px]">
          <span className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
            {t("gradeSummary.projectedFinal")}
          </span>
          <span
            className="font-serif text-[1.6rem] font-bold leading-[1.1]"
            style={{ color: courseColor }}
          >
            {displayValue !== null
              ? `${displayValue.toFixed(1)}%`
              : "\u2014"}
          </span>
          <span className="text-[0.72rem] text-[#6b6b65] font-medium">
            {projectedFinal !== null
              ? t("gradeSummary.gradeBand", {
                  band: getGradeBand(projectedFinal),
                })
              : t("gradeSummary.enterPredicted")}
          </span>
        </div>

        {/* Divider */}
        <div className="w-[1px] h-[50px] bg-[#eae7e0] flex-shrink-0" />

        {/* Note */}
        <p className="text-[0.72rem] text-[#9b9b94] italic flex-1 text-right leading-[1.5]">
          {t("gradeSummary.projectedNote")}
        </p>
      </div>
    </div>
  );
}
