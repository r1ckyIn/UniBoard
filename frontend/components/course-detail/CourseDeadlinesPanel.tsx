"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { useCourseDeadlines } from "@/hooks/use-deadlines";
import RoughCard from "@/components/design-system/RoughCard";

interface CourseDeadlinesPanelProps {
  courseId: string;
  courseColor: string;
  courseSoft: string;
}

/**
 * Right panel card showing course-specific upcoming deadlines
 * with colored stripe and days remaining badge.
 */
export default function CourseDeadlinesPanel({
  courseId,
  courseColor,
  courseSoft,
}: CourseDeadlinesPanelProps) {
  const t = useTranslations("courseDetail");
  const { data, isLoading } = useCourseDeadlines(courseId);

  const deadlines = data?.data ?? [];

  /**
   * Format a due_date string for display.
   * Example: "Wed 22 May · 11:59 PM"
   */
  function formatDueDate(dueDate: string): string {
    try {
      return format(new Date(dueDate), "EEE d MMM · h:mm a");
    } catch {
      return dueDate;
    }
  }

  /**
   * Determine badge text, background, and text color for a deadline.
   */
  function getBadgeStyle(
    status: string,
    daysRemaining: number,
    dueDate: string | undefined
  ) {
    if (status === "completed" || !dueDate) {
      return {
        text: t("deadlines.tbd"),
        bg: "rgba(176,137,104,.11)",
        color: "#b08968",
      };
    }
    if (daysRemaining <= 0) {
      return {
        text: t("deadlines.pastDue"),
        bg: "rgba(217,119,87,.11)",
        color: "#d97757",
      };
    }
    return {
      text: t("deadlines.daysRemaining", { days: daysRemaining }),
      bg: courseSoft,
      color: courseColor,
    };
  }

  return (
    <RoughCard disableHover padding="px-[18px] py-[16px]">
      {/* Title */}
      <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] mb-[12px]">
        <Clock size={16} className="text-[#d97757]" />
        {t("deadlines.title")}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rp-dl-list flex flex-col gap-[6px]">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex gap-[10px] items-stretch px-[10px] py-[10px] rounded-[8px]"
            >
              <div className="rp-dl-stripe w-[3px] rounded-[2px] bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
              <div className="flex-1 flex flex-col justify-center gap-[4px]">
                <div className="h-[12px] w-[70%] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
                <div className="h-[10px] w-[50%] rounded bg-[#e8e5dd] animate-[skeleton-shimmer_1.5s_infinite]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && deadlines.length === 0 && (
        <div className="flex flex-col items-center justify-center py-[24px] text-[#9b9b94]">
          <Clock size={20} className="mb-[6px]" />
          <span className="text-[0.84rem]">{t("deadlines.empty")}</span>
        </div>
      )}

      {/* Deadline list */}
      {!isLoading && deadlines.length > 0 && (
        <div className="rp-dl-list flex flex-col gap-[6px]">
          {deadlines.map((d) => {
            const badge = getBadgeStyle(d.status, d.days_remaining, d.due_date);
            return (
              <div
                key={d.id}
                className="rp-dl-item flex gap-[10px] items-stretch px-[10px] py-[10px] rounded-[8px] hover:bg-[var(--card-bg-hover)] relative transition-colors"
              >
                {/* Color stripe */}
                <div
                  className="rp-dl-stripe w-[3px] rounded-[2px] flex-shrink-0"
                  style={{ background: courseColor }}
                />

                {/* Info */}
                <div className="rp-dl-info flex-1 min-w-0 flex flex-col justify-center">
                  <div className="rp-dl-name text-[0.72rem] font-semibold text-[var(--text-1)] mb-[1px]">
                    {d.title}
                  </div>
                  <div className="rp-dl-time text-[0.64rem] text-[var(--text-3)]">
                    {formatDueDate(d.due_date)}
                  </div>
                </div>

                {/* Days badge */}
                <span
                  className="rp-dl-badge absolute right-[10px] top-1/2 -translate-y-1/2 text-[0.66rem] font-bold px-[9px] py-[2px] rounded-[5px] whitespace-nowrap"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </RoughCard>
  );
}
