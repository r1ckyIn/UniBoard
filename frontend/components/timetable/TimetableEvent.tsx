"use client";

import { useRouter } from "@/lib/i18n/navigation";
import type { TimetableSession } from "@/lib/timetable/types";
import { formatTime } from "@/lib/timetable/time-utils";
import { getCourseColor } from "@/lib/dashboard/course-colors";

interface TimetableEventProps {
  session: TimetableSession & { _col?: number; _cc?: number };
  top: number;
  height: number;
  onClick?: () => void;
}

/**
 * Individual timetable event block.
 * Positioned absolutely within a day column. Course-colored with a left border stripe.
 * Supports overlap-aware layout via _col/_cc from assignCols().
 */
export default function TimetableEvent({
  session,
  top,
  height,
  onClick,
}: TimetableEventProps) {
  const router = useRouter();
  const color = getCourseColor(session.course_code);

  const col = session._col ?? 0;
  const cc = session._cc ?? 1;

  const hasOverlap = cc > 1;
  const leftStyle = hasOverlap
    ? `${col * (100 / cc)}%`
    : "2px";
  const widthStyle = hasOverlap
    ? `calc(${100 / cc}% - 3px)`
    : "calc(100% - 4px)";

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/courses/${session.course_code}`);
    }
  };

  return (
    <div
      className="absolute rounded-[4px] px-[5px] py-[3px] overflow-hidden cursor-pointer z-[5] text-[0.66rem] leading-[1.3] transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:-translate-y-[1px] hover:shadow-[0_3px_10px_rgba(0,0,0,0.1)] hover:z-[20]"
      style={{
        top,
        height,
        left: leftStyle,
        width: widthStyle,
        background: `rgba(${hexToRgb(color.base)}, 0.13)`,
        borderLeft: `3px solid ${color.base}`,
      }}
      onClick={handleClick}
    >
      {/* Time range */}
      <div className="text-[0.6rem] text-[#6b6b65] mb-[1px] opacity-80">
        {formatTime(session.start_hour)} &ndash; {formatTime(session.end_hour)}
      </div>
      {/* Course code */}
      <div className="font-bold text-[0.72rem] text-[#2d2d2a] whitespace-nowrap overflow-hidden text-ellipsis">
        {session.course_code}
      </div>
      {/* Course name */}
      <div className="text-[0.58rem] text-[#6b6b65] whitespace-nowrap overflow-hidden text-ellipsis">
        {session.course_name}
      </div>
      {/* Type + section */}
      <div className="text-[0.58rem] text-[#6b6b65]">
        {session.type} {session.section}
      </div>
      {/* Room (only if tall enough) */}
      {height > 65 && (
        <div className="text-[0.54rem] text-[#9b9b94] mt-[1px] whitespace-nowrap overflow-hidden text-ellipsis">
          {session.location}
        </div>
      )}
    </div>
  );
}

/**
 * Convert hex color string (#rrggbb) to comma-separated RGB values.
 */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
