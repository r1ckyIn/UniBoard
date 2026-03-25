"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import RoughCard from "@/components/design-system/RoughCard";
import { getCourseColor } from "@/lib/dashboard/course-colors";

interface UpcomingDeadline {
  id: string;
  title: string;
  course_id: string;
  due_date: string;
  days_remaining?: number;
}

interface TimetableUpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[];
}

/** Badge color palette based on days remaining */
const BADGE_STYLES: Record<
  string,
  { bg: string; text: string }
> = {
  urgent: { bg: "rgba(217,119,87,.11)", text: "#d97757" },
  warning: { bg: "rgba(176,137,104,.11)", text: "#b08968" },
  normal: { bg: "rgba(106,155,204,.11)", text: "#6a9bcc" },
  later: { bg: "rgba(120,140,93,.11)", text: "#788c5d" },
};

/** Classify urgency from days remaining */
function classifyUrgency(days: number): string {
  if (days <= 2) return "urgent";
  if (days <= 4) return "warning";
  if (days <= 7) return "normal";
  return "later";
}

/** Background tint for urgent/warning items */
function getItemBg(urgency: string): string | undefined {
  if (urgency === "urgent") return "rgba(217,119,87,0.04)";
  if (urgency === "warning") return "rgba(176,137,104,0.04)";
  return undefined;
}

/**
 * Upcoming deadlines card for the timetable right panel.
 * Shows the 4 nearest deadlines with color stripes and countdown badges.
 */
export default function TimetableUpcomingDeadlines({
  deadlines,
}: TimetableUpcomingDeadlinesProps) {
  const t = useTranslations("timetable");

  // Sort by due_date ascending and take first 4
  const topDeadlines = useMemo(() => {
    return [...deadlines]
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )
      .slice(0, 4);
  }, [deadlines]);

  return (
    <RoughCard disableHover padding="py-[18px] px-[18px]">
      {/* Card header */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] text-[#2d2d2a]">
          <Clock size={16} className="text-[#d97757] flex-shrink-0" />
          {t("upcomingDeadlines")}
        </div>
      </div>

      {/* Deadline list */}
      <div className="flex flex-col gap-[6px]">
        {topDeadlines.map((dl) => {
          const daysRemaining =
            dl.days_remaining ??
            differenceInCalendarDays(new Date(dl.due_date), new Date());
          const urgency = classifyUrgency(daysRemaining);
          const color = getCourseColor(dl.course_id);
          const badge = BADGE_STYLES[urgency] ?? BADGE_STYLES.normal;
          const itemBg = getItemBg(urgency);

          // Format countdown text
          const countdownText =
            daysRemaining <= 0
              ? "Today"
              : daysRemaining === 1
                ? "1 day"
                : `${daysRemaining} days`;

          return (
            <div
              key={dl.id}
              className="flex gap-[10px] items-stretch p-[10px] rounded-[8px] hover:bg-[#efede6] cursor-pointer relative"
              style={itemBg ? { backgroundColor: itemBg } : undefined}
            >
              {/* Left color stripe */}
              <div
                className="w-[3px] rounded-[2px] flex-shrink-0"
                style={{ backgroundColor: color.base }}
              />

              {/* Info section */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* Top row: course code */}
                <div className="flex items-center justify-between mb-[2px]">
                  <span
                    className="text-[0.7rem] font-bold"
                    style={{ color: color.base }}
                  >
                    {dl.course_id}
                  </span>
                </div>

                {/* Deadline name */}
                <div className="text-[0.72rem] font-medium text-[#2d2d2a] mb-[1px]">
                  {dl.title}
                </div>

                {/* Time */}
                <div className="text-[0.64rem] text-[#9b9b94]">
                  {format(new Date(dl.due_date), "EEE d/M '\u00b7' h:mm a")}
                </div>
              </div>

              {/* Countdown badge */}
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
    </RoughCard>
  );
}
