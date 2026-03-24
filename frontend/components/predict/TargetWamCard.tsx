"use client";

import { useTranslations } from "next-intl";
import RoughCard from "@/components/design-system/RoughCard";
import { getGradeBand } from "@/lib/utils/grade-band";

const GRADE_FULL_NAME: Record<string, string> = {
  HD: "High Distinction",
  D: "Distinction",
  CR: "Credit",
  P: "Pass",
  F: "Fail",
};

interface TargetWamCardProps {
  targetWam: number;
  onTargetChange: (value: number) => void;
  currentWam: number;
}

/**
 * Target WAM slider right panel card.
 * Displays target WAM value, grade band, range slider with fill gradient, and gap badge.
 */
export default function TargetWamCard({
  targetWam,
  onTargetChange,
  currentWam,
}: TargetWamCardProps) {
  const t = useTranslations("predict");

  const band = getGradeBand(targetWam);
  const bandLabel = GRADE_FULL_NAME[band] ?? band;
  const gap = targetWam - currentWam;
  const pct = ((targetWam - 50) / 50) * 100;

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      <div className="text-center">
        {/* Label */}
        <div className="text-[0.7rem] font-semibold text-[#9b9b94] uppercase tracking-[0.05em] mb-[8px]">
          {t("target.label")}
        </div>

        {/* Target number */}
        <div className="font-serif text-[1.6rem] font-bold text-[#6a9bcc] leading-[1.1]">
          {targetWam}
        </div>

        {/* Band badge */}
        <div>
          <span className="inline-block text-[0.68rem] font-semibold bg-[rgba(106,155,204,0.11)] text-[#6a9bcc] px-[10px] py-[3px] rounded-[5px] mt-[6px]">
            {bandLabel}
          </span>
        </div>

        {/* Slider */}
        <div className="mt-[12px]">
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={targetWam}
            onChange={(e) => onTargetChange(parseInt(e.target.value, 10))}
            className="appearance-none w-full h-[5px] rounded-[3px] outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[16px] [&::-webkit-slider-thumb]:h-[16px] [&::-webkit-slider-thumb]:bg-[#d97757] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.18)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[16px] [&::-moz-range-thumb]:h-[16px] [&::-moz-range-thumb]:bg-[#d97757] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_1px_5px_rgba(0,0,0,0.18)] [&::-moz-range-thumb]:cursor-pointer"
            style={{
              background: `linear-gradient(to right, #d97757 0%, #d97757 ${pct}%, #eae7e0 ${pct}%, #eae7e0 100%)`,
            }}
            data-testid="target-slider"
          />
        </div>

        {/* Gap badge */}
        <div>
          {gap > 0 ? (
            <span className="inline-block text-[0.68rem] font-semibold px-[10px] py-[3px] rounded-[5px] mt-[10px] bg-[rgba(106,155,204,0.11)] text-[#6a9bcc]">
              {t("target.toGo", { gap: gap.toFixed(1) })}
            </span>
          ) : (
            <span className="inline-block text-[0.68rem] font-semibold px-[10px] py-[3px] rounded-[5px] mt-[10px] bg-[rgba(120,140,93,0.11)] text-[#788c5d]">
              {t("target.onTrack")}
            </span>
          )}
        </div>
      </div>
    </RoughCard>
  );
}
