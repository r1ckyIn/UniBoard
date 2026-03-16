"use client";

import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isToday,
  format,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DeadlineResponse } from "@/lib/api/types";

interface CalendarGridProps {
  deadlines: DeadlineResponse[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  /** Dates with multiple conflicting deadlines (shown with red dot) */
  conflictDates?: string[];
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Simple month calendar grid with deadline dot markers.
 * Uses CSS grid (not a calendar library). Click a day to filter the timeline.
 */
export default function CalendarGrid({
  deadlines,
  selectedDate,
  onSelectDate,
  conflictDates = [],
}: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading empty cells for alignment (0 = Sunday)
  const leadingBlanks = getDay(monthStart);

  // Build a set of dates that have deadlines for quick lookup
  const deadlineDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const d of deadlines) {
      const dateStr = format(parseISO(d.due_date), "yyyy-MM-dd");
      dateSet.add(dateStr);
    }
    return dateSet;
  }, [deadlines]);

  // Build conflict dates set
  const conflictSet = useMemo(() => new Set(conflictDates), [conflictDates]);

  function handleDayClick(day: Date) {
    if (selectedDate && isSameDay(selectedDate, day)) {
      // Toggle off if clicking the same day
      onSelectDate(null);
    } else {
      onSelectDate(day);
    }
  }

  return (
    <div>
      {/* Header: month/year + navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-[var(--color-card-bg-hover)] transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} style={{ color: "var(--color-text-2)" }} />
        </button>
        <h3
          role="heading"
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
        >
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded hover:bg-[var(--color-card-bg-hover)] transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={18} style={{ color: "var(--color-text-2)" }} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] uppercase tracking-wider py-1"
            style={{ color: "var(--color-text-3)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blank cells */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="h-9" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const hasDeadline = deadlineDates.has(dateKey);
          const hasConflict = conflictSet.has(dateKey);
          const isSelected = selectedDate ? isSameDay(selectedDate, day) : false;
          const today = isToday(day);

          return (
            <button
              key={dateKey}
              data-day={dateKey}
              onClick={() => handleDayClick(day)}
              className={`
                relative h-9 rounded text-xs font-medium transition-colors
                flex flex-col items-center justify-center
                hover:bg-[var(--color-card-bg-hover)]
                ${isSelected ? "bg-[var(--color-orange-soft)]" : ""}
                ${today && !isSelected ? "ring-1 ring-[var(--color-orange)]" : ""}
              `}
              style={{
                color: isSelected ? "var(--color-orange)" : "var(--color-text-1)",
              }}
            >
              <span>{format(day, "d")}</span>
              {/* Deadline dot indicator */}
              {hasDeadline && (
                <span
                  data-deadline-dot
                  className="deadline-dot absolute bottom-0.5 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: hasConflict ? "#c0392b" : "var(--color-orange)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
