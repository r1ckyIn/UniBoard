"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import RoughCard from "@/components/design-system/RoughCard";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import {
  classifyUrgency,
  URGENCY_BADGE,
  getItemBg,
  type UrgencyLevel,
} from "@/lib/timetable/urgency";

interface UpcomingDeadline {
  id: string;
  title: string;
  course_code: string;
  due_date: string;
  days_remaining?: number;
}

interface TimetableUpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[];
}

/**
 * Upcoming deadlines card for the timetable right panel.
 * Receives pre-sorted, pre-sliced deadlines from the parent orchestrator.
 */
export default function TimetableUpcomingDeadlines({
  deadlines,
}: TimetableUpcomingDeadlinesProps) {
  const t = useTranslations("timetable");
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 2;
    setCanScrollDown(
      el.scrollHeight > el.clientHeight + threshold &&
      el.scrollTop + el.clientHeight < el.scrollHeight - threshold
    );
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, deadlines]);

  return (
    <RoughCard disableHover padding="py-[18px] px-[18px]">
      <div className="flex items-center justify-between mb-[12px]">
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] text-[#2d2d2a]">
          <Clock size={16} className="text-[#d97757] flex-shrink-0" />
          {t("upcomingDeadlines")}
        </div>
      </div>

      <div className="relative">
        <div
          ref={listRef}
          data-testid="deadline-scroll-container"
          className="flex flex-col gap-[6px] overflow-y-auto"
          style={{ maxHeight: 320 }}
        >
        {deadlines.map((dl) => {
          const daysRemaining =
            dl.days_remaining ??
            differenceInCalendarDays(new Date(dl.due_date), new Date());
          const urgency: UrgencyLevel = classifyUrgency(daysRemaining);
          const color = getCourseColor(dl.course_code);
          const badge = URGENCY_BADGE[urgency];
          const itemBg = getItemBg(urgency);

          const countdownText =
            daysRemaining <= 0
              ? t("countdownToday")
              : daysRemaining === 1
                ? t("countdownOneDay")
                : t("countdownDays", { count: daysRemaining });

          return (
            <div
              key={dl.id}
              className="flex gap-[10px] items-stretch p-[10px] rounded-[8px] hover:bg-[#efede6] cursor-pointer relative"
              style={itemBg ? { backgroundColor: itemBg } : undefined}
            >
              <div
                className="w-[3px] rounded-[2px] flex-shrink-0"
                style={{ backgroundColor: color.base }}
              />

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-[2px]">
                  <span
                    className="text-[0.7rem] font-bold"
                    style={{ color: color.base }}
                  >
                    {dl.course_code}
                  </span>
                </div>

                <div className="text-[0.72rem] font-medium text-[#2d2d2a] mb-[1px]">
                  {dl.title}
                </div>

                <div className="text-[0.64rem] text-[#9b9b94]">
                  {format(new Date(dl.due_date), "EEE d/M '\u00b7' h:mm a")}
                </div>
              </div>

              <span
                className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[0.68rem] font-bold py-[2px] px-[9px] rounded-[5px]"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {countdownText}
              </span>
            </div>
          );
        })}
        </div>

        {/* Scroll overflow gradient indicator */}
        {canScrollDown && (
          <div
            data-testid="scroll-indicator"
            className="absolute bottom-0 left-0 right-0 h-[32px] pointer-events-none z-10"
            style={{
              background: "linear-gradient(transparent, rgba(246,245,240,0.95))",
            }}
          />
        )}
      </div>
    </RoughCard>
  );
}
