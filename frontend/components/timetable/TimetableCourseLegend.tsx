"use client";

import { useTranslations } from "next-intl";
import { Palette } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { getCourseColor } from "@/lib/dashboard/course-colors";

interface LegendCourse {
  id: string;
  code: string;
  name: string;
}

interface TimetableCourseLegendProps {
  courses: LegendCourse[];
}

/**
 * Course legend card for the timetable right panel.
 * Shows colored dot + course code + name for each enrolled course.
 */
export default function TimetableCourseLegend({
  courses,
}: TimetableCourseLegendProps) {
  const t = useTranslations("timetable");

  return (
    <RoughCard disableHover padding="py-[18px] px-[18px]">
      {/* Card header */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="text-[0.92rem] font-semibold flex items-center gap-[8px] text-[#2d2d2a]">
          <Palette size={16} className="text-[#d97757] flex-shrink-0" />
          {t("courseLegend")}
        </div>
        <span className="text-[0.68rem] font-semibold py-[3px] px-[9px] rounded-[6px] bg-[rgba(217,119,87,0.11)] text-[#d97757]">
          {t("enrolledBadge", { count: courses.length })}
        </span>
      </div>

      {/* Legend list */}
      <div className="flex flex-col gap-[6px]">
        {courses.map((course) => {
          const color = getCourseColor(course.code);
          return (
            <div
              key={course.id}
              className="flex items-center gap-[8px] text-[0.72rem]"
            >
              {/* Color dot */}
              <div
                className="w-[10px] h-[10px] rounded-[3px] flex-shrink-0"
                style={{ backgroundColor: color.base }}
              />
              {/* Code */}
              <span className="font-semibold text-[#2d2d2a]">
                {course.code}
              </span>
              {/* Name */}
              <span className="text-[#9b9b94] text-[0.64rem] whitespace-nowrap overflow-hidden text-ellipsis">
                {course.name}
              </span>
            </div>
          );
        })}
      </div>
    </RoughCard>
  );
}
