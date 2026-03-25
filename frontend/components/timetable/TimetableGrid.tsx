"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { TimetableSession, WeekMode, SemesterWeek } from "@/lib/timetable/types";
import {
  timeToY,
  GRID_HEIGHT,
  NORMAL_ZONE_END_PX,
} from "@/lib/timetable/time-utils";
import { assignCols } from "@/lib/timetable/overlap";
import TimetableEvent from "@/components/timetable/TimetableEvent";
import TimetableNowLine from "@/components/timetable/TimetableNowLine";
import TimetableDeadlineOverlay, {
  type DeadlineItem,
} from "@/components/timetable/TimetableDeadlineOverlay";
import TimetableBreakMessage from "@/components/timetable/TimetableBreakMessage";
import { cn } from "@/lib/utils/cn";

interface TimetableGridProps {
  sessions: TimetableSession[];
  deadlines: DeadlineItem[];
  weekPosition: number;
  mode: WeekMode;
  currentWeek: SemesterWeek;
  isBreak: boolean;
  isCurrentWeekView: boolean;
}

/** Width of the time-label gutter in pixels */
const GUTTER_WIDTH = 52;

/** Day keys for i18n lookup */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Normal-zone hour labels (8 AM - 6 PM) */
const NORMAL_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

/** Compressed-zone hours (7 PM - 11 PM) */
const COMPRESSED_HOURS = [19, 20, 21, 22, 23];

/** Format hour as 12h label (e.g. 8 -> "8 AM", 13 -> "1 PM") */
function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/**
 * Main 7-day timetable grid.
 * Dual-density time axis: normal (8-19) at 60px/hr, compressed (19-23) at 28px/hr.
 * Renders day headers, time gutter, horizontal grid lines, event blocks, deadline
 * overlays, the current-time now line, and a break message overlay.
 */
export default function TimetableGrid({
  sessions,
  deadlines,
  weekPosition,
  mode,
  currentWeek,
  isBreak,
  isCurrentWeekView,
}: TimetableGridProps) {
  const t = useTranslations("timetable");
  const bodyRef = useRef<HTMLDivElement>(null);

  // Current time tracking for the now line
  const [currentHour, setCurrentHour] = useState(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  useEffect(() => {
    if (!isCurrentWeekView) return;

    const interval = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours() + now.getMinutes() / 60);
    }, 60000);

    return () => clearInterval(interval);
  }, [isCurrentWeekView]);

  // Scroll body to ~40px on mount for better initial view
  useEffect(() => {
    const el = bodyRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: 40 });
    }
  }, []);

  // Compute day dates from monday_date
  const dayDates = useMemo(() => {
    const monday = new Date(currentWeek.monday_date + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getTime() + i * 86400000);
      const dd = d.getDate();
      const mm = d.getMonth() + 1;
      return `${dd}/${mm}`;
    });
  }, [currentWeek.monday_date]);

  // Current day of week (0=Mon, 6=Sun)
  const todayIndex = useMemo(() => {
    const jsDay = new Date().getDay();
    // JS: 0=Sun, 1=Mon, ..., 6=Sat -> Convert to 0=Mon, ..., 6=Sun
    return jsDay === 0 ? 6 : jsDay - 1;
  }, []);

  // Group sessions by day and assign overlap columns
  const sessionsByDay = useMemo(() => {
    const map: Record<number, (TimetableSession & { _col?: number; _cc?: number })[]> = {};
    for (let d = 0; d < 7; d++) {
      const daySessions = sessions.filter((s) => s.day === d);
      map[d] = assignCols([...daySessions]);
    }
    return map;
  }, [sessions]);

  // Pre-group deadlines by day to avoid 7x filter in child components
  const deadlinesByDay = useMemo(() => {
    const map: Record<number, DeadlineItem[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    for (const dl of deadlines) {
      (map[dl.day] ??= []).push(dl);
    }
    return map;
  }, [deadlines]);

  // Build horizontal grid lines
  const gridLines = useMemo(() => {
    const lines: { top: number; isHalf: boolean; isCompressed: boolean }[] = [];
    // Normal zone: 8-18, full and half hour lines
    for (let h = 8; h <= 18; h++) {
      lines.push({ top: timeToY(h), isHalf: false, isCompressed: false });
      if (h < 18) {
        lines.push({ top: timeToY(h + 0.5), isHalf: true, isCompressed: false });
      }
    }
    // Compressed zone
    for (const h of COMPRESSED_HOURS) {
      lines.push({ top: timeToY(h), isHalf: false, isCompressed: true });
    }
    // Final line at bottom
    lines.push({ top: timeToY(23) + 28, isHalf: false, isCompressed: true });
    return lines;
  }, []);

  return (
    <div className="bg-[#f6f5f0] rounded-[14px] shadow-[0_1px_3px_rgba(20,20,19,.04),0_4px_14px_rgba(20,20,19,.025)] overflow-hidden p-0">
      <div className="flex border-b border-[#eae7e0] bg-[rgba(246,245,240,0.6)]">
        <div className="flex-shrink-0" style={{ width: GUTTER_WIDTH }} />
        <div className="flex-1 grid grid-cols-7">
          {DAY_KEYS.map((key, i) => {
            const isToday = isCurrentWeekView && i === todayIndex;
            return (
              <div
                key={key}
                className={cn(
                  "text-center py-[10px] px-[4px] text-[0.72rem] font-semibold text-[#6b6b65]",
                  i > 0 && "border-l border-[#eae7e0]",
                  isToday && "text-[#d97757] bg-[rgba(217,119,87,0.04)]"
                )}
              >
                {t(`days.${key}`)}
                <br />
                <span
                  className={cn(
                    "text-[0.68rem] font-medium text-[#9b9b94]",
                    isToday && "text-[#d97757]",
                    mode === "all" && "invisible"
                  )}
                >
                  {dayDates[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        ref={bodyRef}
        className="flex overflow-y-auto"
        style={{ maxHeight: "calc(100vh - var(--spacing-header-h, 56px) - 200px)" }}
      >
        <div
          className="flex-shrink-0 relative border-r border-[#eae7e0]"
          style={{ width: GUTTER_WIDTH, height: GRID_HEIGHT }}
        >
          {NORMAL_HOURS.map((h) => (
            <span
              key={`t-${h}`}
              className="absolute right-[8px] text-[0.65rem] font-medium text-[#9b9b94] whitespace-nowrap"
              style={{ top: timeToY(h), transform: "translateY(-50%)" }}
            >
              {hourLabel(h)}
            </span>
          ))}
          {COMPRESSED_HOURS.map((h) => (
            <span
              key={`tc-${h}`}
              className="absolute right-[8px] text-[0.58rem] text-[#9b9b94] opacity-60 whitespace-nowrap"
              style={{ top: timeToY(h), transform: "translateY(-50%)" }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>

        <div className="flex-1 relative" style={{ height: GRID_HEIGHT }}>
          {gridLines.map((line, idx) => (
            <div
              key={`hl-${idx}`}
              className={cn(
                "absolute left-0 right-0 h-px z-[1] pointer-events-none",
                line.isCompressed
                  ? "bg-[#eae7e0] opacity-45"
                  : line.isHalf
                    ? "bg-[rgba(234,231,224,0.45)]"
                    : "bg-[#eae7e0]"
              )}
              style={{ top: line.top }}
            />
          ))}

          {/* Compressed zone separator (dashed line at 660px) */}
          <div
            className="absolute left-0 right-0 h-px z-[3] opacity-25"
            style={{
              top: NORMAL_ZONE_END_PX,
              background:
                "repeating-linear-gradient(90deg, #b08968 0, #b08968 5px, transparent 5px, transparent 10px)",
            }}
          />

          {/* Compressed zone tinted background */}
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none z-0"
            style={{
              top: NORMAL_ZONE_END_PX,
              background: "rgba(176,137,104,0.02)",
            }}
          />

          <div className="grid grid-cols-7 absolute inset-0 z-[4]">
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const isToday = isCurrentWeekView && dayIdx === todayIndex;
              const daySessions = sessionsByDay[dayIdx] ?? [];

              return (
                <div
                  key={dayIdx}
                  className={cn(
                    "relative overflow-visible",
                    dayIdx > 0 && "border-l border-[#eae7e0]",
                    isToday && "bg-[rgba(217,119,87,0.018)]"
                  )}
                >
                  {daySessions.map((s) => (
                    <TimetableEvent
                      key={s.id}
                      session={s}
                      top={timeToY(s.start_hour)}
                      height={timeToY(s.end_hour) - timeToY(s.start_hour)}
                    />
                  ))}

                  <TimetableDeadlineOverlay
                    deadlines={deadlinesByDay[dayIdx] ?? []}
                    dayIndex={dayIdx}
                  />

                  {/* Now line (current day only when viewing current week) */}
                  {isToday && currentHour >= 8 && currentHour <= 23 && (
                    <TimetableNowLine top={timeToY(currentHour)} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Break overlay */}
          {isBreak && <TimetableBreakMessage />}
        </div>
      </div>
    </div>
  );
}
