"use client";

import { useTranslations } from "next-intl";
import RoughCard from "@/components/design-system/RoughCard";
import { getGradeBand } from "@/lib/utils/grade-band";
import { wamToGpa } from "@/lib/predict/wam-to-gpa";

interface WamOverviewCardProps {
  wam: number;
  allFilled: boolean;
}

/**
 * WAM Overview right panel card.
 * Displays the current/projected WAM, grade band badge, GPA conversion, and basis text.
 */
export default function WamOverviewCard({ wam, allFilled }: WamOverviewCardProps) {
  const t = useTranslations("predict");

  const band = getGradeBand(wam);
  const bandLabel = allFilled
    ? t(`gradeName.${band}`)
    : t("wamOverview.fillPredictions");

  return (
    <RoughCard disableHover padding="py-[32px] px-[24px]">
      <div className="text-center">
        {/* WAM number */}
        <div className="font-serif text-[2rem] font-bold text-[#d97757] leading-[1.1] inline-block">
          {wam.toFixed(1)}
        </div>

        {/* Grade band badge */}
        <div>
          <span className="inline-block text-[0.68rem] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757] px-[10px] py-[3px] rounded-[5px] mt-[8px]">
            {bandLabel}
          </span>
        </div>

        {/* GPA line */}
        <div className="text-[0.82rem] text-[#6b6b65] mt-[6px]">
          {t("wamOverview.gpa", { gpa: wamToGpa(wam).toFixed(1) })}
        </div>

        {/* Basis text */}
        <div className="text-[0.72rem] text-[#9b9b94] mt-[6px]">
          {allFilled ? t("wamOverview.basisAll") : t("wamOverview.basisPartial")}
        </div>
      </div>
    </RoughCard>
  );
}
