"use client";

import { useTranslations } from "next-intl";
import {
  Target,
  Lock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import type { RequiredScoreResult } from "@/lib/predict/wam-engine";
import { getFeasibility } from "@/lib/predict/wam-to-gpa";
import type { Feasibility } from "@/lib/predict/wam-to-gpa";

const FEASIBILITY_COLOR: Record<Feasibility, string> = {
  feasible: "#788c5d",
  warning: "#d97757",
  impossible: "#cc4455",
};

interface RequiredScoresCardProps {
  results: RequiredScoreResult[];
  courseColors: Record<string, { base: string; soft: string }>;
}

/**
 * Required scores right panel card.
 * Shows per-course minimum average score needed on remaining assessments
 * to achieve the target WAM, with feasibility icons.
 */
export default function RequiredScoresCard({
  results,
  courseColors,
}: RequiredScoresCardProps) {
  const t = useTranslations("predict");

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      {/* Card title */}
      <div className="flex items-center gap-[7px] mb-[10px]">
        <Target size={16} className="text-[#d97757] flex-shrink-0" />
        <span className="text-[0.82rem] font-semibold">
          {t("required.title")}
        </span>
      </div>

      {/* Note */}
      <div className="text-[0.66rem] text-[#9b9b94] italic mb-[10px]">
        {t("required.note")}
      </div>

      {/* Requirement rows */}
      {results.map((r) => {
        const isExcluded = r.excluded;
        const isLocked = r.locked;
        const feasibility = !isExcluded && !isLocked ? getFeasibility(r.required) : null;

        // Score display
        let scoreText: string;
        let scoreColor: string;
        if (isExcluded || isLocked) {
          scoreText = "\u2014";
          scoreColor = "#9b9b94";
        } else if (r.required < 0) {
          scoreText = "0.0";
          scoreColor = FEASIBILITY_COLOR[feasibility!];
        } else {
          scoreText = r.required.toFixed(1);
          scoreColor = FEASIBILITY_COLOR[feasibility!];
        }

        return (
          <div
            key={r.code}
            className="flex items-center gap-[8px] py-[7px] border-b border-[#eae7e0] last:border-b-0"
          >
            {/* Color dot */}
            <div
              className="w-[8px] h-[8px] rounded-full flex-shrink-0"
              style={{
                backgroundColor: courseColors[r.code]?.base ?? "#9b9b94",
              }}
            />

            {/* Course code */}
            <span className="text-[0.78rem] font-semibold text-[#2d2d2a] flex-1">
              {r.code}
            </span>

            {/* Score */}
            <span
              className="font-serif text-[0.92rem] font-bold min-w-[36px] text-right"
              style={{ color: scoreColor }}
            >
              {scoreText}
            </span>

            {/* Feasibility icon */}
            <span className="flex-shrink-0 w-[16px] h-[16px] grid place-items-center">
              {isExcluded || isLocked ? (
                <Lock size={14} className="text-[#9b9b94]" />
              ) : feasibility === "feasible" ? (
                <CheckCircle size={14} className="text-[#788c5d]" />
              ) : feasibility === "warning" ? (
                <AlertTriangle size={14} className="text-[#d97757]" />
              ) : (
                <XCircle size={14} className="text-[#cc4455]" />
              )}
            </span>
          </div>
        );
      })}
    </RoughCard>
  );
}
