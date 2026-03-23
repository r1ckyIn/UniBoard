"use client";

import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Folder,
  Clipboard,
  FileText,
  MessageCircle,
  Info,
  ArrowUp,
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { getUrgency, URGENCY_COLORS } from "@/lib/deadlines/urgency";
import type { components } from "@/lib/api/types.gen";
import type { MouseEvent } from "react";

type Deadline = components["schemas"]["Deadline"];

interface DeadlineCardProps {
  deadline: Deadline;
  isExpanded: boolean;
  onToggle: () => void;
  courseColor: { base: string; soft: string };
}

// Placeholder materials since Deadline schema has no materials field
const PLACEHOLDER_MATERIALS = [
  {
    week: "Ref",
    title: "Assessment Specification",
    type: "PDF",
    icon: "clipboard" as const,
  },
  {
    week: "Wk 4",
    title: "Related Lecture Slides",
    type: "PDF",
    icon: "file-text" as const,
  },
];

const MATERIAL_ICONS = {
  clipboard: Clipboard,
  "file-text": FileText,
} as const;

export default function DeadlineCard({
  deadline,
  isExpanded,
  onToggle,
  courseColor,
}: DeadlineCardProps) {
  const t = useTranslations("deadlines");

  const daysRemaining = differenceInCalendarDays(
    new Date(deadline.due_date),
    new Date()
  );
  const urgency = getUrgency(daysRemaining);
  const colors = URGENCY_COLORS[urgency];

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Exclude clicks on AI input and material items
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-ai-input-row]") ||
      target.closest("[data-mat-item]")
    ) {
      return;
    }
    onToggle();
  };

  return (
    <div
      className={`relative ${isExpanded ? "cursor-default" : "cursor-pointer"}`}
      onClick={handleClick}
      data-testid="deadline-card"
    >
      {/* Inner card wrapper */}
      <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)] overflow-hidden relative hover:shadow-[0_2px_8px_rgba(20,20,19,0.06),0_8px_24px_rgba(20,20,19,0.04)] transition-shadow duration-200">
        {/* Left color stripe */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] z-[3] pointer-events-none"
          style={{ backgroundColor: courseColor.base }}
          data-testid="color-stripe"
        />

        {/* Summary section (always visible) */}
        <div className="p-[16px_20px_16px_24px] min-w-0">
          {/* Top row: title + days badge */}
          <div className="flex items-start justify-between gap-3 mb-[6px]">
            <div className="font-serif font-semibold text-[0.95rem] text-[#2d2d2a] leading-[1.3]">
              {deadline.title}
            </div>
            <span
              className="text-[0.68rem] font-bold py-[3px] px-[10px] rounded-[5px] whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: colors.soft,
                color: colors.dot,
              }}
              data-testid="urgency-badge"
            >
              {daysRemaining <= 0
                ? t("pastDue")
                : daysRemaining === 1
                  ? t("dayRemaining")
                  : t("daysRemaining", { count: String(daysRemaining) })}
            </span>
          </div>

          {/* Course line */}
          <div
            className="text-[0.76rem] font-semibold mb-[4px]"
            style={{ color: courseColor.base }}
          >
            {deadline.course_code} &middot; {deadline.course_name}
          </div>

          {/* Due date line */}
          <div className="text-[0.72rem] text-[#9b9b94] mb-[8px]">
            {format(new Date(deadline.due_date), "EEE d MMM · h:mm a")}
          </div>

          {/* AI summary placeholder */}
          <div className="italic text-[0.78rem] text-[#6b6b65] leading-[1.5] border-t border-[#eae7e0] pt-[8px]">
            {t("aiSummaryPlaceholder")}
          </div>

          {/* Expand hint */}
          <div
            className="text-[0.64rem] text-[#9b9b94] mt-[6px] flex items-center gap-[4px] transition-opacity duration-300"
            style={{ opacity: isExpanded ? 0 : 1 }}
          >
            <ChevronDown size={12} />
            {t("expandHint")}
          </div>
        </div>

        {/* Expanded section */}
        <div
          className="overflow-hidden transition-[max-height] duration-[400ms]"
          style={{
            maxHeight: isExpanded ? "800px" : "0",
            transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div className="px-[20px] pb-[20px] pl-[24px]">
            {/* Related Materials */}
            <div className="font-serif text-[0.84rem] font-semibold text-[#2d2d2a] mt-[12px] mb-[8px] flex items-center gap-[6px]">
              <Folder size={16} className="text-[#d97757] flex-shrink-0" />
              {t("relatedMaterials")}
            </div>

            {PLACEHOLDER_MATERIALS.map((mat) => {
              const IconComponent = MATERIAL_ICONS[mat.icon];
              return (
                <div
                  key={mat.title}
                  data-mat-item
                  className="flex items-center gap-[14px] py-[10px] px-[12px] rounded-[8px] transition-colors duration-150 cursor-pointer border-b border-[#eae7e0] last:border-b-0 hover:bg-[#efede6]"
                >
                  <span
                    className="text-[0.64rem] font-bold py-[3px] px-[8px] rounded-[5px] whitespace-nowrap flex-shrink-0 min-w-[48px] text-center"
                    style={{
                      backgroundColor: courseColor.soft,
                      color: courseColor.base,
                    }}
                  >
                    {mat.week}
                  </span>
                  <div className="w-[30px] h-[30px] rounded-[8px] grid place-items-center flex-shrink-0">
                    <IconComponent size={16} className="text-[#6b6b65]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8rem] font-semibold text-[#2d2d2a] whitespace-nowrap overflow-hidden text-ellipsis">
                      {mat.title}
                    </div>
                    <div className="text-[0.66rem] text-[#9b9b94] mt-[1px]">
                      {mat.type}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Chat section */}
            <div className="mt-[8px] px-[2px]">
              <div className="font-serif text-[0.84rem] font-semibold text-[#2d2d2a] mt-[12px] mb-[8px] flex items-center gap-[6px]">
                <MessageCircle
                  size={16}
                  className="text-[#d97757] flex-shrink-0"
                />
                {t("askAbout")}
              </div>

              {/* Context note */}
              <div className="text-[0.66rem] text-[#9b9b94] italic mb-[8px] flex items-center gap-[4px]">
                <Info size={12} className="flex-shrink-0" />
                {t("aiContextNote")}
              </div>

              {/* Coming Soon badge */}
              <div className="flex justify-center mb-[8px]">
                <span className="text-[0.72rem] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757] rounded px-[12px] py-[4px]">
                  {t("aiComingSoon")}
                </span>
              </div>

              {/* Input row */}
              <div data-ai-input-row className="flex items-center gap-[10px]">
                <input
                  type="text"
                  disabled
                  className="flex-1 border-[1.5px] border-[#e8e5dd] rounded-full bg-[#f6f5f0] px-[20px] py-[10px] text-[0.82rem] text-[#2d2d2a] outline-none opacity-50 cursor-not-allowed"
                  placeholder={t("aiPlaceholder")}
                />
                <button
                  disabled
                  className="w-[36px] h-[36px] rounded-full bg-[#d97757] text-white grid place-items-center flex-shrink-0 opacity-50 cursor-not-allowed"
                >
                  <ArrowUp size={16} />
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-[0.64rem] text-[#9b9b94] mt-[6px] text-center italic">
                {t("aiDisclaimer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
