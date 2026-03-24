"use client";

import { useTranslations } from "next-intl";
import { Target } from "lucide-react";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import type { FacultyScheme } from "@/lib/predict/faculty-weights";

interface PredictTitleRowProps {
  facultyScheme: FacultyScheme;
  onFacultyChange: (scheme: FacultyScheme) => void;
  totalCp: number;
}

/**
 * Title row for the Predict page: Target icon, heading,
 * semester badge, cp badge, and faculty weighting selector.
 */
export default function PredictTitleRow({
  facultyScheme,
  onFacultyChange,
  totalCp,
}: PredictTitleRowProps) {
  const t = useTranslations("predict");

  return (
    <AnimatedEntry delay={1}>
      <div className="flex items-center justify-between px-[2px] mb-[8px]">
        {/* Left side: icon + heading + semester badge */}
        <div className="flex items-center gap-[10px]">
          <Target size={22} className="text-[#d97757] flex-shrink-0" />
          <h1 className="font-serif text-[1.5rem] font-bold text-[#2d2d2a] tracking-[-0.02em]">
            {t("title")}
          </h1>
          <span className="text-[0.68rem] font-semibold py-[3px] px-[10px] rounded-[6px] bg-[rgba(217,119,87,0.11)] text-[#d97757]">
            {t("semesterBadge")}
          </span>
        </div>

        {/* Right side: cp badge + faculty selector */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[0.72rem] font-semibold py-[4px] px-[12px] rounded-[6px] bg-[#f6f5f0] border border-[#d0cdc4] text-[#6b6b65] cursor-default">
            {t("cpBadge", { cp: String(totalCp) })}
          </span>
          <select
            className="bg-[#f6f5f0] border border-[#d0cdc4] rounded-[8px] text-[0.78rem] font-medium text-[#6b6b65] py-[4px] px-[10px] outline-none cursor-pointer"
            value={facultyScheme}
            onChange={(e) =>
              onFacultyChange(e.target.value as FacultyScheme)
            }
          >
            <option value="standard">{t("facultyStandard")}</option>
            <option value="engineering">{t("facultyEngineering")}</option>
            <option value="science_honours">
              {t("facultyScienceHonours")}
            </option>
          </select>
        </div>
      </div>
    </AnimatedEntry>
  );
}
