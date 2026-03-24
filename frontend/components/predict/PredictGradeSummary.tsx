"use client";

import { useTranslations } from "next-intl";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { getGradeBand } from "@/lib/utils/grade-band";

interface PredictGradeSummaryProps {
  currentAvg: number | null;
  projectedFinal: number | null;
  assessedWeight: number;
  courseColor: string;
}

/**
 * Grade summary row at the bottom of an expanded predict card.
 * Shows Current average, Projected final, and a note about live updates.
 */
export default function PredictGradeSummary({
  currentAvg,
  projectedFinal,
  assessedWeight,
  courseColor,
}: PredictGradeSummaryProps) {
  const t = useTranslations("predict");
  const displayProjected = useCountUp(projectedFinal);

  return (
    <div className="flex items-center justify-between gap-[20px] pt-[14px] mt-[12px] border-t-[1.5px] border-[#eae7e0]">
      {/* Current */}
      <div className="flex flex-col items-center gap-[2px]">
        <span className="text-[0.68rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
          {t("gradeSummary.current")}
        </span>
        <span
          className="font-serif text-[1.4rem] font-bold leading-[1.1]"
          style={{ color: courseColor }}
        >
          {currentAvg !== null ? `${currentAvg.toFixed(1)}%` : "\u2014"}
        </span>
        <span className="text-[0.7rem] text-[#6b6b65] font-medium">
          {t("gradeSummary.assessedSub", {
            pct: String(Math.round(assessedWeight * 100)),
          })}
        </span>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-[44px] bg-[#eae7e0] flex-shrink-0" />

      {/* Projected */}
      <div className="flex flex-col items-center gap-[2px]">
        <span className="text-[0.68rem] font-semibold text-[#9b9b94] uppercase tracking-[0.04em]">
          {t("gradeSummary.projected")}
        </span>
        <span
          className="font-serif text-[1.4rem] font-bold leading-[1.1]"
          style={{
            color: projectedFinal !== null ? courseColor : "#9b9b94",
          }}
        >
          {displayProjected !== null
            ? `${displayProjected.toFixed(1)}%`
            : "\u2014"}
        </span>
        <span className="text-[0.7rem] text-[#6b6b65] font-medium">
          {projectedFinal !== null
            ? t("gradeSummary.gradeBand", {
                band: getGradeBand(projectedFinal),
              })
            : t("gradeSummary.enterScores")}
        </span>
      </div>

      {/* Divider */}
      <div className="w-[1px] h-[44px] bg-[#eae7e0] flex-shrink-0" />

      {/* Note */}
      <p className="text-[0.72rem] text-[#9b9b94] italic flex-1 text-right leading-[1.5]">
        {t("gradeSummary.note")}
      </p>
    </div>
  );
}
