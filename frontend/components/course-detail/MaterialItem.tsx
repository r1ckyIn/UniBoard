"use client";

import { useTranslations } from "next-intl";
import { FileText, BookOpen } from "lucide-react";

interface MaterialItemProps {
  title: string;
  source: "canvas" | "ed";
  sourceType: "module" | "lesson";
  itemCount?: number;
  slideCount?: number;
  url?: string;
  weekNumber: number;
  courseColor: string;
  courseSoft: string;
  isNew?: boolean;
  onPreview?: (url: string, title: string) => void;
}

/**
 * A single material item row with week badge, source icon, title,
 * and optional "New" badge for recently added Ed content.
 */
export default function MaterialItem({
  title,
  sourceType,
  itemCount,
  slideCount,
  url,
  weekNumber,
  courseColor,
  courseSoft,
  isNew,
  onPreview,
}: MaterialItemProps) {
  const t = useTranslations("courseDetail");

  // Build the type label string
  const typeLabel =
    sourceType === "module"
      ? `Module${itemCount ? ` \u00b7 ${itemCount} items` : ""}`
      : `Lesson${slideCount ? ` \u00b7 ${t("materials.slideCount", { count: slideCount })}` : ""}`;

  return (
    <div
      className={`mat-item flex items-center gap-[14px] px-[14px] py-[12px] rounded-[8px] border-b border-[#eae7e0] last:border-b-0 transition-colors duration-150 hover:bg-[#efede6] ${url && onPreview ? "cursor-pointer" : "cursor-default"}`}
      onClick={url && onPreview ? () => onPreview(url, title) : undefined}
    >
      {/* Week badge */}
      <span
        className="mat-week text-[0.66rem] font-bold px-[8px] py-[3px] rounded-[5px] whitespace-nowrap flex-shrink-0 min-w-[52px] text-center"
        style={{ color: courseColor, backgroundColor: courseSoft }}
      >
        {t("materials.weekBadge", { week: weekNumber })}
      </span>

      {/* Source icon */}
      <div
        className="mat-icon w-[32px] h-[32px] rounded-[8px] grid place-items-center flex-shrink-0"
        style={{
          backgroundColor: `${courseColor}14`,
          color: courseColor,
        }}
      >
        {sourceType === "module" ? (
          <FileText size={16} />
        ) : (
          <BookOpen size={16} />
        )}
      </div>

      {/* Info */}
      <div className="mat-info flex-1 min-w-0">
        <div className="mat-title text-[0.84rem] font-semibold text-[#2d2d2a] whitespace-nowrap overflow-hidden text-ellipsis">
          {title}
        </div>
        <div className="mat-type text-[0.68rem] text-[#9b9b94] mt-[1px]">
          {typeLabel}
        </div>
      </div>

      {/* New badge */}
      {isNew && (
        <span className="mat-badge-new text-[0.58rem] font-bold px-[7px] py-[2px] rounded-[4px] bg-[rgba(120,140,93,0.11)] text-[#788c5d] flex-shrink-0 uppercase">
          {t("materials.newBadge")}
        </span>
      )}
    </div>
  );
}
