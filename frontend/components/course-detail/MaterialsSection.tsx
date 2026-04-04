"use client";

import { useTranslations } from "next-intl";
import { Folder } from "lucide-react";
import type { components } from "@/lib/api/types.gen";
import RoughCard from "@/components/design-system/RoughCard";
import MaterialItem from "@/components/course-detail/MaterialItem";

type Material = components["schemas"]["Material"];

interface MaterialsSectionProps {
  materials: Material[];
  courseColor: string;
  courseSoft: string;
  onPreview?: (url: string, title: string) => void;
}

/**
 * Extract week number from a material title using regex.
 * Falls back to index + 1 if no match found.
 */
function extractWeek(title: string, fallback: number): number {
  const match = title.match(/Week\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : fallback;
}

/**
 * Course materials section card: RoughCard border,
 * list of material items with week badges and source type icons.
 */
export default function MaterialsSection({
  materials,
  courseColor,
  courseSoft,
  onPreview,
}: MaterialsSectionProps) {
  const t = useTranslations("courseDetail");

  // Determine which materials should show "New" badge
  // Heuristic: last Ed lesson (has slide_count) is considered new
  const lastEdLessonIndex = materials.reduce(
    (acc, m, i) => (m.source === "ed" && m.slide_count ? i : acc),
    -1
  );

  // Count unique weeks for badge display
  const weekCount = new Set(
    materials.map((m, i) => extractWeek(m.title, i + 1))
  ).size;

  return (
    <RoughCard disableHover padding="px-[26px] py-[22px]">
      {/* Card header */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px]">
          <Folder size={18} className="text-[#d97757]" />
          {t("materials.title")}
        </div>
        <span className="text-[0.68rem] px-[9px] py-[3px] rounded-[6px] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757]">
          {weekCount} weeks
        </span>
      </div>

      {/* Materials list or empty state */}
      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-[32px] text-[#9b9b94]">
          <Folder size={24} className="mb-[8px]" />
          <span className="text-[0.84rem]">{t("materials.empty")}</span>
        </div>
      ) : (
        materials.map((m, i) => (
          <MaterialItem
            key={m.id}
            title={m.title}
            source={m.source}
            sourceType={m.source_type}
            itemCount={m.items?.length}
            slideCount={m.slide_count}
            url={m.url}
            weekNumber={extractWeek(m.title, i + 1)}
            courseColor={courseColor}
            courseSoft={courseSoft}
            isNew={i === lastEdLessonIndex}
            onPreview={onPreview}
          />
        ))
      )}
    </RoughCard>
  );
}
