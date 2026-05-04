"use client";

import { useTranslations } from "next-intl";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import type { DigestFilterType } from "@/lib/digest/types";

interface DigestFilterBarProps {
  activeFilter: DigestFilterType;
  onFilterChange: (filter: DigestFilterType) => void;
}

const FILTERS: { key: DigestFilterType; labelKey: string }[] = [
  { key: "all", labelKey: "filterAll" },
  { key: "grade", labelKey: "filterGrade" },
  { key: "staff", labelKey: "filterStaff" },
  { key: "deadline", labelKey: "filterDeadline" },
  { key: "announcement", labelKey: "filterAnnouncement" },
  { key: "exam", labelKey: "filterExam" },
];

/**
 * Row of pill-style filter buttons for digest highlight types.
 * Active filter is visually highlighted with orange accent.
 */
export default function DigestFilterBar({
  activeFilter,
  onFilterChange,
}: DigestFilterBarProps) {
  const t = useTranslations("digest");

  return (
    <AnimatedEntry delay={2}>
      <div className="flex items-center gap-[6px]">
        {FILTERS.map((filter) => {
          const isActive = filter.key === activeFilter;
          return (
            <button
              key={filter.key}
              className={`text-[0.74rem] font-semibold py-[5px] px-[12px] rounded-[8px] border cursor-pointer transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] ${
                isActive
                  ? "bg-[rgba(217,119,87,0.11)] text-[#d97757] border-[rgba(217,119,87,0.25)]"
                  : "bg-[#f6f5f0] text-[#6b6b65] border-[#e8e5dd] hover:bg-[#efede6]"
              }`}
              onClick={() => onFilterChange(filter.key)}
            >
              {t(filter.labelKey)}
            </button>
          );
        })}
      </div>
    </AnimatedEntry>
  );
}
