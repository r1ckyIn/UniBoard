"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Calendar, AlertCircle } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { useDeadlines } from "@/hooks/use-deadlines";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import DeadlineTitleRow from "@/components/deadlines/DeadlineTitleRow";
import DeadlineTimelineView from "@/components/deadlines/DeadlineTimelineView";
import DeadlineCalendarView from "@/components/deadlines/DeadlineCalendarView";
import type { components } from "@/lib/api/types.gen";
import type { ViewMode, FilterMode } from "@/lib/deadlines/types";

type Deadline = components["schemas"]["Deadline"];

export default function DeadlinesPage() {
  const t = useTranslations("deadlines");
  const { data, isLoading, isError } = useDeadlines();
  const deadlineList: Deadline[] = data?.data ?? [];

  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Client-side filtered + sorted deadlines, with upcoming count computed in the same pass
  const { filteredDeadlines, upcomingCount } = useMemo(() => {
    const now = new Date();
    let result = [...deadlineList];

    if (selectedCourse) {
      result = result.filter((dl) => dl.course_code === selectedCourse);
    }

    if (selectedDate) {
      result = result.filter(
        (dl) => format(new Date(dl.due_date), "yyyy-MM-dd") === selectedDate
      );
    }

    if (filterMode === "week") {
      result = result.filter((dl) => {
        const days = differenceInCalendarDays(new Date(dl.due_date), now);
        return days >= 0 && days <= 7;
      });
    }

    result.sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    let upcoming = 0;
    for (const dl of result) {
      if (differenceInCalendarDays(new Date(dl.due_date), now) >= 0) upcoming++;
    }

    return { filteredDeadlines: result, upcomingCount: upcoming };
  }, [deadlineList, selectedCourse, selectedDate, filterMode]);

  const courseOptions = useMemo(() => {
    const seen = new Set<string>();
    return deadlineList.reduce<{ value: string; label: string }[]>(
      (acc, dl) => {
        if (!seen.has(dl.course_code)) {
          seen.add(dl.course_code);
          acc.push({ value: dl.course_code, label: dl.course_code });
        }
        return acc;
      },
      []
    );
  }, [deadlineList]);

  // Clear selectedDate when switching away from calendar view
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedDate(null);
  };

  // Toggle expanded card (accordion behavior)
  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-4">
      <AnimatedEntry delay={1}>
        <DeadlineTitleRow
          upcomingCount={upcomingCount}
          semester={t("semester")}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          courseOptions={courseOptions}
          selectedCourse={selectedCourse}
          onCourseChange={setSelectedCourse}
        />
      </AnimatedEntry>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-[14px] pl-[30px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#f6f5f0] rounded-[14px] h-[120px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]"
              data-testid="skeleton-card"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle size={32} className="text-[#d97757]" />
          <p className="text-[0.85rem] text-[#6b6b65]">
            {t("errorMessage")}
          </p>
        </div>
      )}

      {/* Empty state (timeline mode only — calendar always renders its grid) */}
      {!isLoading &&
        !isError &&
        viewMode === "timeline" &&
        filteredDeadlines.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Calendar size={48} className="text-[#9b9b94]" />
            <h2 className="text-[1.1rem] font-semibold font-serif text-[#2d2d2a]">
              {t("emptyTitle")}
            </h2>
            <p className="text-[0.85rem] text-[#6b6b65]">{t("emptyBody")}</p>
          </div>
        )}

      {/* Timeline content */}
      {!isLoading &&
        !isError &&
        viewMode === "timeline" &&
        filteredDeadlines.length > 0 && (
          <DeadlineTimelineView
            deadlines={filteredDeadlines}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
          />
        )}

      {/* Calendar content */}
      {!isLoading && !isError && viewMode === "calendar" && (
        <>
          <DeadlineCalendarView
            deadlines={deadlineList}
            onDateFilter={setSelectedDate}
            selectedDate={selectedDate}
          />
          {selectedDate && filteredDeadlines.length > 0 && (
            <div className="mt-4">
              <DeadlineTimelineView
                deadlines={filteredDeadlines}
                expandedId={expandedId}
                onToggleExpand={handleToggleExpand}
              />
            </div>
          )}
          {selectedDate && filteredDeadlines.length === 0 && (
            <p className="text-center text-[0.85rem] text-[#9b9b94] py-6">
              {t("emptyBody")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
