"use client";

import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Folder,
  Clipboard,
  FileText,
  MoreHorizontal,
  Pin,
} from "lucide-react";
import DeadlineAiChat from "@/components/deadlines/DeadlineAiChat";
import { differenceInCalendarDays, format } from "date-fns";
import { getUrgency, URGENCY_COLORS } from "@/lib/deadlines/urgency";
import {
  useCreateDeadlineAction,
  useRemoveDeadlineAction,
} from "@/hooks/use-deadlines";
import type { components } from "@/lib/api/types.gen";
import { useState, useRef, useEffect } from "react";
import type { MouseEvent } from "react";

type Deadline = components["schemas"]["Deadline"];

interface DeadlineCardProps {
  deadline: Deadline & { is_pinned?: boolean; is_deleted?: boolean };
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

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const createAction = useCreateDeadlineAction();
  const removeAction = useRemoveDeadlineAction();
  const isPinned = !!deadline.is_pinned;
  const isOverdue = urgency === "overdue";

  // Click-outside handler (use mousedown per Research Pitfall 4)
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    // Use setTimeout to avoid immediate close from the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const handlePin = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isPinned) {
      removeAction.mutate({ deadlineId: deadline.id, action: "pin" });
    } else {
      createAction.mutate({ deadlineId: deadline.id, action: "pin" });
    }
    setMenuOpen(false);
  };

  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    createAction.mutate({ deadlineId: deadline.id, action: "delete" });
    setMenuOpen(false);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Exclude clicks on AI input, material items, and three-dot menu
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-ai-input-row]") ||
      target.closest("[data-mat-item]") ||
      target.closest("[data-actions-menu]")
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
      {/* Inner card wrapper -- overdue gets red 2px border (D-04) */}
      <div
        className={`bg-[#f6f5f0] border-[1.5px] rounded-[14px] shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)] overflow-hidden relative hover:shadow-[0_2px_8px_rgba(20,20,19,0.06),0_8px_24px_rgba(20,20,19,0.04)] transition-shadow duration-200 ${isOverdue ? "border-[#d97757] border-[2px]" : "border-[#d0cdc4]"}`}
      >
        {/* Left color stripe -- amber for pinned (D-03) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] z-[3] pointer-events-none"
          style={{ backgroundColor: isPinned ? "#b08968" : courseColor.base }}
          data-testid="color-stripe"
        />

        {/* Summary section (always visible) */}
        <div className="p-[16px_20px_16px_24px] min-w-0">
          {/* Top row: title (+ pin icon if pinned) + due time + three-dot menu */}
          <div className="flex items-start justify-between gap-3 mb-[6px]">
            <div className="flex items-center gap-[6px] min-w-0 flex-1">
              {isPinned && (
                <Pin
                  size={14}
                  className="text-[#b08968] flex-shrink-0 -rotate-45"
                  data-testid="pin-icon"
                />
              )}
              <div className="font-serif font-semibold text-[0.95rem] text-[#2d2d2a] leading-[1.3] truncate">
                {deadline.title}
              </div>
            </div>

            <div className="flex items-center gap-[8px] flex-shrink-0">
              {/* Due time -- enlarged font per D-01 */}
              <span
                className="font-serif font-bold text-[1.05rem] text-[#2d2d2a] whitespace-nowrap"
                data-testid="due-time"
              >
                {format(new Date(deadline.due_date), "h:mm a")}
              </span>

              {/* Three-dot menu per D-02 */}
              <div className="relative" data-actions-menu ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  className="p-1 rounded-md hover:bg-[#efede6] transition-colors"
                  data-testid="deadline-menu-trigger"
                >
                  <MoreHorizontal size={16} className="text-[#9b9b94]" />
                </button>

                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-white border border-[#e8e5dd] rounded-[8px] shadow-md z-10 py-1 min-w-[140px] animate-in fade-in duration-150"
                    data-testid="deadline-menu-dropdown"
                  >
                    <button
                      onClick={handlePin}
                      className="w-full text-left px-3 py-[6px] text-[0.78rem] text-[#2d2d2a] hover:bg-[#efede6] transition-colors flex items-center gap-2"
                    >
                      <Pin
                        size={13}
                        className={
                          isPinned ? "text-[#b08968]" : "text-[#9b9b94]"
                        }
                      />
                      {isPinned ? t("unpin") : t("pinToTop")}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-[6px] text-[0.78rem] text-[#c44] hover:bg-[rgba(204,68,85,.06)] transition-colors flex items-center gap-2"
                    >
                      {t("deleteDeadline")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Urgency badge -- shows "overdue" text for overdue deadlines */}
          <span
            className="text-[0.68rem] font-bold py-[3px] px-[10px] rounded-[5px] whitespace-nowrap inline-block"
            style={{ backgroundColor: colors.soft, color: colors.dot }}
            data-testid="urgency-badge"
          >
            {daysRemaining < 0
              ? t("overdue")
              : daysRemaining === 0
                ? t("pastDue")
                : daysRemaining === 1
                  ? t("dayRemaining")
                  : t("daysRemaining", { count: String(daysRemaining) })}
          </span>

          {/* Course line */}
          <div
            className="text-[0.76rem] font-semibold mb-[4px] mt-[6px]"
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
          className="overflow-hidden transition-[max-height] [transition-duration:var(--motion-slow)] [transition-timing-function:var(--ease-claude-out)]"
          style={{
            maxHeight: isExpanded ? "1200px" : "0",
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
                  className="flex items-center gap-[14px] py-[10px] px-[12px] rounded-[8px] transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] cursor-pointer border-b border-[#eae7e0] last:border-b-0 hover:bg-[#efede6]"
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

            {/* AI Chat section — only mount when expanded to avoid 16 idle hooks */}
            {isExpanded && (
              <DeadlineAiChat
                courseId={deadline.course_id}
                isExpanded={isExpanded}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
