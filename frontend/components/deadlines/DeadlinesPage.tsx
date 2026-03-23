"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Calendar, AlertCircle } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useDeadlines } from "@/hooks/use-deadlines";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import DeadlineTitleRow from "@/components/deadlines/DeadlineTitleRow";
import DeadlineTimelineView from "@/components/deadlines/DeadlineTimelineView";
import type { components } from "@/lib/api/types.gen";

type Deadline = components["schemas"]["Deadline"];
type ViewMode = "timeline" | "calendar";
type FilterMode = "all" | "week";

export default function DeadlinesPage() {
  const t = useTranslations("deadlines");
  const { data, isLoading, isError } = useDeadlines();
  const deadlineList: Deadline[] = data?.data ?? [];

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Client-side filtered + sorted deadlines
  const filteredDeadlines = useMemo(() => {
    let result = [...deadlineList];

    // Filter by course
    if (selectedCourse) {
      result = result.filter((dl) => dl.course_code === selectedCourse);
    }

    // Filter by mode: "week" = days remaining <= 7 from due_date
    if (filterMode === "week") {
      result = result.filter((dl) => {
        const days = differenceInCalendarDays(
          new Date(dl.due_date),
          new Date()
        );
        return days >= 0 && days <= 7;
      });
    }

    // Sort by due_date ascending
    result.sort(
      (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    return result;
  }, [deadlineList, selectedCourse, filterMode]);

  // Extract unique course options from raw data
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

  // Count upcoming (non-past) deadlines in filtered set
  const upcomingCount = filteredDeadlines.filter(
    (dl) =>
      differenceInCalendarDays(new Date(dl.due_date), new Date()) >= 0
  ).length;

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
          onViewModeChange={setViewMode}
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

      {/* Empty state */}
      {!isLoading && !isError && filteredDeadlines.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Calendar size={48} className="text-[#9b9b94]" />
          <h2 className="text-[1.1rem] font-semibold font-serif text-[#2d2d2a]">
            {t("emptyTitle")}
          </h2>
          <p className="text-[0.85rem] text-[#6b6b65]">{t("emptyBody")}</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && filteredDeadlines.length > 0 && (
        <>
          {viewMode === "timeline" && (
            <DeadlineTimelineView
              deadlines={filteredDeadlines}
              expandedId={expandedId}
              onToggleExpand={handleToggleExpand}
            />
          )}
          {viewMode === "calendar" && (
            <div className="flex flex-col items-center gap-3 py-12 text-[#9b9b94] text-[0.85rem]">
              Calendar view coming in Plan 03
            </div>
          )}
        </>
      )}
    </div>
  );
}
