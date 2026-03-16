"use client";

import { useState, useMemo } from "react";
import { useDeadlines, useDeadlineConflicts } from "@/lib/hooks/useDeadlines";
import RoughCard from "@/components/design-system/RoughCard";
import CalendarGrid from "@/components/deadlines/CalendarGrid";
import DeadlineList from "@/components/deadlines/DeadlineList";
import DeadlineFilters, {
  type DeadlineFilterState,
} from "@/components/deadlines/DeadlineFilters";

/**
 * Deadlines page with calendar + filterable timeline dual view.
 * Calendar and list are interlinked: clicking a day filters the list.
 */
export default function DeadlinesPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filters, setFilters] = useState<DeadlineFilterState>({});

  const { data: deadlines, isLoading } = useDeadlines({
    course_code: filters.course_code,
    urgency: filters.urgency,
    include_past: filters.include_past,
  });

  const { data: conflicts } = useDeadlineConflicts();

  // Extract conflict date strings for calendar
  const conflictDates = useMemo(
    () => conflicts?.map((c) => c.date) ?? [],
    [conflicts]
  );

  const deadlineList = deadlines ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1
        className="text-2xl"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Deadlines
      </h1>

      {/* Calendar */}
      {isLoading ? (
        <RoughCard className="p-5 bg-[var(--color-card-bg)]">
          <div className="h-64 rounded bg-[var(--color-divider)] animate-pulse" />
        </RoughCard>
      ) : (
        <RoughCard className="p-5 bg-[var(--color-card-bg)]">
          <CalendarGrid
            deadlines={deadlineList}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            conflictDates={conflictDates}
          />
        </RoughCard>
      )}

      {/* Filters */}
      <DeadlineFilters
        deadlines={deadlineList}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Deadline list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <RoughCard key={i} className="p-4 bg-[var(--color-card-bg)]">
              <div className="h-16 rounded bg-[var(--color-divider)] animate-pulse" />
            </RoughCard>
          ))}
        </div>
      ) : (
        <DeadlineList
          deadlines={deadlineList}
          selectedDate={selectedDate}
          onClearDate={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
