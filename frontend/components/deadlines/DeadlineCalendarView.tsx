"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  getDaysInMonth,
  startOfMonth,
  getDay,
  isToday,
  format,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getCourseColor } from "@/lib/dashboard/course-colors";
import type { components } from "@/lib/api/types.gen";

type Deadline = components["schemas"]["Deadline"];

interface DeadlineCalendarViewProps {
  deadlines: Deadline[];
  onDateFilter: (dateStr: string | null) => void;
  selectedDate: string | null;
}

interface CalendarCell {
  day: number;
  month: number; // 0-indexed
  year: number;
  isCurrentMonth: boolean;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/**
 * Get Monday-based first day offset for a given month.
 * getDay() returns 0=Sun, we convert to 0=Mon.
 */
function getFirstDayOffset(year: number, month: number): number {
  const firstDay = getDay(startOfMonth(new Date(year, month, 1)));
  return firstDay === 0 ? 6 : firstDay - 1;
}

export default function DeadlineCalendarView({
  deadlines,
  onDateFilter,
  selectedDate,
}: DeadlineCalendarViewProps) {
  const tDashboard = useTranslations("dashboard");
  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const { year: viewYear, month: viewMonth } = view;

  // Build a lookup map: "YYYY-MM-DD" -> Deadline[]
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const dl of deadlines) {
      const dateKey = format(new Date(dl.due_date), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(dl);
      map.set(dateKey, existing);
    }
    return map;
  }, [deadlines]);

  // Navigate months atomically
  const goToPrevMonth = useCallback(() => {
    setView((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  }, []);

  const goToNextMonth = useCallback(() => {
    setView((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  }, []);

  // Build calendar grid cells
  const calendarCells = useMemo(() => {
    const cells: CalendarCell[] = [];
    const daysInCurrent = getDaysInMonth(new Date(viewYear, viewMonth, 1));
    const firstDayOffset = getFirstDayOffset(viewYear, viewMonth);

    // Previous month padding
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const daysInPrev = getDaysInMonth(new Date(prevYear, prevMonth, 1));
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrev - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrent; d++) {
      cells.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete the grid
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          day: d,
          month: nextMonth,
          year: nextYear,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Format month label
  const monthLabel = format(new Date(viewYear, viewMonth, 1), "MMMM yyyy");

  // Handle cell click
  const handleCellClick = useCallback(
    (dateKey: string) => {
      if (selectedDate === dateKey) {
        onDateFilter(null);
      } else {
        onDateFilter(dateKey);
      }
    },
    [selectedDate, onDateFilter]
  );

  return (
    <div data-testid="calendar-view">
      {/* Month navigation bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="Previous month"
          className="bg-transparent border-none cursor-pointer text-[#9b9b94] p-1 rounded-[6px] transition-all duration-150 hover:bg-[#f0ede6] hover:text-[#2d2d2a] grid place-items-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-serif font-semibold text-[1rem]" data-testid="month-label">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Next month"
          className="bg-transparent border-none cursor-pointer text-[#9b9b94] p-1 rounded-[6px] transition-all duration-150 hover:bg-[#f0ede6] hover:text-[#2d2d2a] grid place-items-center"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Day headers */}
        {DAY_KEYS.map((key) => (
          <div
            key={key}
            className="text-[0.72rem] font-semibold text-[#9b9b94] py-1 uppercase"
          >
            {tDashboard(`calendar.days.${key}`)}
          </div>
        ))}

        {/* Day cells */}
        {calendarCells.map((cell, i) => {
          const cellDate = new Date(cell.year, cell.month, cell.day);
          const isTodayCell = cell.isCurrentMonth && isToday(cellDate);
          const dateKey = format(cellDate, "yyyy-MM-dd");
          const dayDeadlines = cell.isCurrentMonth
            ? deadlinesByDate.get(dateKey)
            : undefined;
          const hasDeadlines = !!dayDeadlines && dayDeadlines.length > 0;
          const isSelected = selectedDate === dateKey;

          // Deduplicate course codes for dots
          const uniqueCourses = hasDeadlines
            ? [...new Set(dayDeadlines.map((dl) => dl.course_code))]
            : [];

          return (
            <div
              key={i}
              role={hasDeadlines ? "button" : undefined}
              tabIndex={hasDeadlines ? 0 : undefined}
              onClick={
                hasDeadlines ? () => handleCellClick(dateKey) : undefined
              }
              onKeyDown={
                hasDeadlines
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCellClick(dateKey);
                      }
                    }
                  : undefined
              }
              data-testid={
                isTodayCell
                  ? "calendar-cell-today"
                  : hasDeadlines
                    ? `calendar-cell-${cell.day}`
                    : undefined
              }
              className={cn(
                "min-h-[72px] p-[6px] rounded-[8px] flex flex-col",
                cell.isCurrentMonth
                  ? "bg-[#f6f5f0] border border-[#e8e5dd]"
                  : "opacity-30 bg-transparent border border-transparent",
                isTodayCell &&
                  "bg-[rgba(217,119,87,.08)] border-[#d97757]",
                isSelected &&
                  !isTodayCell &&
                  "bg-[rgba(217,119,87,.15)] border-[#d97757]",
                hasDeadlines && "cursor-pointer"
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  "text-[0.78rem] text-[#6b6b65] leading-none",
                  isTodayCell && "font-bold text-[#d97757]"
                )}
              >
                {cell.day}
              </span>

              {/* Deadline dots */}
              {hasDeadlines && (
                <div className="flex flex-wrap gap-[3px] mt-auto">
                  {uniqueCourses.slice(0, 3).map((code) => (
                    <span
                      key={code}
                      className="inline-block w-[8px] h-[8px] rounded-full"
                      data-testid="deadline-dot"
                      style={{
                        backgroundColor: getCourseColor(code).base,
                      }}
                    />
                  ))}
                  {uniqueCourses.length > 3 && (
                    <span className="text-[0.6rem] text-[#9b9b94] leading-[8px]">
                      +{uniqueCourses.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
