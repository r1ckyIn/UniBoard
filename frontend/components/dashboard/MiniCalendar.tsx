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
import RoughCard from "@/components/design-system/RoughCard";

interface DeadlineDay {
  date: string; // ISO date string (YYYY-MM-DD)
  totalWeight: number; // Cumulative weight of deadlines on this day (0-1)
}

interface MiniCalendarProps {
  deadlineDays: DeadlineDay[];
  onDateClick: (date: Date) => void;
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

/**
 * Get the deadline-dot background style based on totalWeight threshold.
 */
function getDeadlineBg(totalWeight: number): string {
  if (totalWeight <= 0.1) return "rgba(217,119,87,0.08)";
  if (totalWeight <= 0.3) return "rgba(217,119,87,0.15)";
  return "rgba(217,119,87,0.22)";
}

interface CalendarCell {
  day: number;
  month: number; // 0-indexed
  year: number;
  isCurrentMonth: boolean;
}

export default function MiniCalendar({
  deadlineDays,
  onDateClick,
}: MiniCalendarProps) {
  const t = useTranslations("dashboard");
  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const { year: viewYear, month: viewMonth } = view;

  // Build a lookup map for deadline days: "YYYY-MM-DD" -> totalWeight
  const deadlineMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deadlineDays) {
      map.set(d.date, d.totalWeight);
    }
    return map;
  }, [deadlineDays]);

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

  return (
    <RoughCard padding="py-4 px-5" disableHover>
      {/* Month navigation bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="bg-transparent border-none cursor-pointer text-text-3 p-1 rounded-[6px] transition-all duration-150 hover:bg-card-bg-hover hover:text-text-1 grid place-items-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-serif font-semibold text-[0.88rem]">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className="bg-transparent border-none cursor-pointer text-text-3 p-1 rounded-[6px] transition-all duration-150 hover:bg-card-bg-hover hover:text-text-1 grid place-items-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px text-center">
        {/* Day headers */}
        {DAY_KEYS.map((key) => (
          <div
            key={key}
            className="text-[0.62rem] font-semibold text-text-3 py-1 uppercase"
          >
            {t(`calendar.days.${key}`)}
          </div>
        ))}

        {/* Day cells */}
        {calendarCells.map((cell, i) => {
          const cellDate = new Date(cell.year, cell.month, cell.day);
          const isTodayCell = cell.isCurrentMonth && isToday(cellDate);
          const dateKey = format(cellDate, "yyyy-MM-dd");
          const deadlineWeight = deadlineMap.get(dateKey);
          const hasDeadline =
            cell.isCurrentMonth && deadlineWeight !== undefined;

          return (
            <div
              key={i}
              role={hasDeadline ? "button" : undefined}
              tabIndex={hasDeadline ? 0 : undefined}
              onClick={
                hasDeadline ? () => onDateClick(cellDate) : undefined
              }
              onKeyDown={
                hasDeadline
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDateClick(cellDate);
                      }
                    }
                  : undefined
              }
              className={cn(
                "text-[0.74rem] py-1 rounded-[6px] text-text-2",
                !cell.isCurrentMonth && "text-text-3 opacity-35",
                isTodayCell && "bg-orange text-white font-semibold",
                hasDeadline && !isTodayCell && "text-orange font-semibold",
                hasDeadline && "cursor-pointer"
              )}
              style={
                hasDeadline && !isTodayCell
                  ? { backgroundColor: getDeadlineBg(deadlineWeight!) }
                  : undefined
              }
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </RoughCard>
  );
}
