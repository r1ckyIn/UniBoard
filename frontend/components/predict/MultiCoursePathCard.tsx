/**
 * Multi-course path planner verdict card (AIFEAT-03 / D-C3 + D-D1).
 *
 * Phase 34: green/red verdict badge + required_avg + suggested_target (when
 * unreachable) + optional AI advisory paragraph. Advisory is HIDDEN when
 * advisory_text === null per D-D1 silent fallback contract — the math always
 * flows through.
 */
"use client";

import { useTranslations } from "next-intl";
import { Target } from "lucide-react";

import RoughCard from "@/components/design-system/RoughCard";

export interface MultiCoursePathData {
  target_wam: number;
  current_wam: number;
  is_achievable: boolean;
  required_avg: number | null;
  max_reachable: number;
  suggested_target: number | null;
  advisory_text: string | null;
  language: "en" | "zh";
}

interface MultiCoursePathCardProps {
  path: MultiCoursePathData | null;
  remainingCp: number;
}

export default function MultiCoursePathCard({
  path,
  remainingCp,
}: MultiCoursePathCardProps) {
  const t = useTranslations("predict.path");

  const header = (
    <div className="flex items-center gap-[7px] mb-[10px]">
      <Target size={16} className="text-[#d97757] flex-shrink-0" />
      <span className="text-[0.82rem] font-semibold text-[#2d2d2a]">
        {t("title")}
      </span>
    </div>
  );

  if (!path) {
    return (
      <RoughCard disableHover padding="py-[22px] px-[20px]">
        {header}
        <p className="text-[0.72rem] text-[#9b9b94] mt-[4px]">{t("empty")}</p>
      </RoughCard>
    );
  }

  const verdictColor = path.is_achievable
    ? "bg-[rgba(120,140,93,.18)] text-[#566a3b]"
    : "bg-[rgba(204,68,85,.14)] text-[#9a2c3a]";

  return (
    <RoughCard disableHover padding="py-[22px] px-[20px]">
      {header}

      {/* Verdict badge */}
      <span
        className={`inline-block px-[10px] py-[3px] text-[0.68rem] font-semibold rounded-[6px] ${verdictColor}`}
      >
        {path.is_achievable
          ? t("reachable")
          : t("unreachable", { suggested: path.suggested_target ?? 0 })}
      </span>

      {/* Required avg line (only when meaningful) */}
      {path.required_avg !== null ? (
        <div className="text-[0.74rem] text-[#2d2d2a] mt-[10px]">
          {t("requiredAvg", {
            remainingCp,
            requiredAvg: path.required_avg.toFixed(1),
          })}
        </div>
      ) : null}

      {/* Max reachable line (only when target is unreachable) */}
      {!path.is_achievable ? (
        <div className="text-[0.66rem] text-[#6b6b65] mt-[4px]">
          {t("maxReachable", { value: path.max_reachable.toFixed(1) })}
        </div>
      ) : null}

      {/* AI advisory paragraph — D-D1: hide entirely when null (silent fallback) */}
      {path.advisory_text ? (
        <p className="italic text-[0.72rem] text-[#6b6b65] mt-[12px]">
          {path.advisory_text}
        </p>
      ) : null}
    </RoughCard>
  );
}
