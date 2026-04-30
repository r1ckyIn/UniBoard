"use client";

import { useTranslations } from "next-intl";
import { timeToY } from "@/lib/timetable/time-utils";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import { URGENCY_BADGE, type UrgencyLevel } from "@/lib/timetable/urgency";

export interface DeadlineItem {
  id: string;
  title: string;
  course_code: string;
  course_name: string;
  tag: string;
  urgency: UrgencyLevel;
  day: number;
  hour: number;
  time_display: string;
}

interface TimetableDeadlineOverlayProps {
  deadlines: DeadlineItem[];
  dayIndex: number;
}

/**
 * Renders deadline indicator lines for a single day column.
 * Each deadline shows a dashed line, tag badge, diamond dot, and hover tooltip.
 */
export default function TimetableDeadlineOverlay({
  deadlines,
  dayIndex,
}: TimetableDeadlineOverlayProps) {
  const t = useTranslations("timetable");
  const dayDeadlines = deadlines.filter((dl) => dl.day === dayIndex);

  if (dayDeadlines.length === 0) return null;

  return (
    <>
      {dayDeadlines.map((dl) => {
        const color = getCourseColor(dl.course_code).base;
        const yPos = timeToY(dl.hour);
        const badge = URGENCY_BADGE[dl.urgency] ?? URGENCY_BADGE.normal;

        return (
          <div
            key={dl.id}
            className="group absolute left-0 right-0 h-[14px] z-[15] cursor-pointer flex items-center"
            style={{ top: yPos }}
          >
            <div
              className="dl-dash flex-1 h-[2px] group-hover:h-[3px] transition-[height] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
              style={{
                background: `repeating-linear-gradient(90deg, ${color} 0, ${color} 7px, transparent 7px, transparent 13px)`,
              }}
            />

            <span
              className="text-[0.56rem] font-bold py-[2px] px-[5px] rounded-[3px] text-white whitespace-nowrap flex-shrink-0 mx-[2px]"
              style={{ background: color }}
            >
              {dl.tag}
            </span>

            <div
              className="w-[10px] h-[10px] rounded-[3px] rotate-45 flex-shrink-0 group-hover:scale-[1.2] transition-transform duration-150"
              style={{ background: color }}
            />

            <div className="hidden group-hover:block absolute bottom-[18px] left-[4px] bg-white rounded-[10px] p-[12px_14px] shadow-[0_6px_24px_rgba(20,20,19,.12),0_2px_6px_rgba(20,20,19,.06)] z-[200] min-w-[200px] border border-[#e8e5dd]">
              <div className="absolute -bottom-[6px] left-[16px] w-[10px] h-[10px] bg-white border-b border-r border-[#e8e5dd] rotate-45" />

              <span
                className="inline-block text-[0.62rem] font-bold py-[2px] px-[8px] rounded-[4px] mb-[6px] uppercase"
                style={{ background: badge.bg, color: badge.text }}
              >
                {dl.urgency}
              </span>

              <div className="font-serif font-semibold text-[0.82rem] text-[#2d2d2a] mb-[2px]">
                {dl.title}
              </div>

              <div
                className="text-[0.68rem] font-semibold mb-[4px]"
                style={{ color }}
              >
                {dl.course_code} {dl.course_name}
              </div>

              <div className="text-[0.68rem] text-[#6b6b65] mb-[6px]">
                {dl.time_display}
              </div>

              <span className="text-[0.66rem] font-semibold text-[#d97757]">
                {t("tooltipViewDetails")} &rarr;
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
