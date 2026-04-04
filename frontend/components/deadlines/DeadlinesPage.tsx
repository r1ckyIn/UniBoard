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
import type { FilterMode } from "@/lib/deadlines/types";

type Deadline = components["schemas"]["Deadline"];

export default function DeadlinesPage() {
  const t = useTranslations("deadlines");
  const { data, isLoading, isError } = useDeadlines();
  const deadlineList: Deadline[] = useMemo(() => data?.data ?? [], [data]);

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { filteredDeadlines, upcomingCount } = useMemo(() => {
    const now = new Date();
    let result = [...deadlineList];

    // Exclude user-deleted deadlines in all modes
    result = result.filter(
      (dl) => !(dl as Record<string, unknown>).is_deleted
    );

    if (selectedCourse) {
      result = result.filter((dl) => dl.course_code === selectedCourse);
    }

    if (filterMode === "all") {
      // D-05: "All" shows only incomplete + overdue-submittable
      // Hide completed deadlines. Show: upcoming, overdue, submitted
      result = result.filter(
        (dl) =>
          dl.status === "upcoming" ||
          dl.status === "overdue" ||
          dl.status === "submitted"
      );
    } else if (filterMode === "week") {
      // D-06: "This Week" shows ALL statuses within 7-day window (including completed)
      result = result.filter((dl) => {
        const days = differenceInCalendarDays(new Date(dl.due_date), now);
        return days >= -7 && days <= 7;
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
  }, [deadlineList, selectedCourse, filterMode]);

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

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex flex-col gap-4">
      <AnimatedEntry delay={1}>
        <DeadlineTitleRow
          upcomingCount={upcomingCount}
          semester={t("semester")}
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

      {/* Timeline content */}
      {!isLoading && !isError && filteredDeadlines.length > 0 && (
        <DeadlineTimelineView
          deadlines={filteredDeadlines}
          expandedId={expandedId}
          onToggleExpand={handleToggleExpand}
        />
      )}
    </div>
  );
}
