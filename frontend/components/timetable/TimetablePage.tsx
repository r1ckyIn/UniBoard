"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { differenceInWeeks, addDays, format } from "date-fns";

import {
  useTimetableSessions,
  useSemesterWeeks,
  timetableKeys,
} from "@/hooks/use-timetable";
import { useDeadlines } from "@/hooks/use-deadlines";
import { useCourses } from "@/hooks/use-courses";
import type { WeekMode, SemesterWeek } from "@/lib/timetable/types";
import type { DeadlineItem } from "@/components/timetable/TimetableDeadlineOverlay";
import { getCourseColor } from "@/lib/dashboard/course-colors";

import TimetableTitleRow from "@/components/timetable/TimetableTitleRow";
import TimetableGrid from "@/components/timetable/TimetableGrid";
import TimetableRightPanel from "@/components/timetable/TimetableRightPanel";
import AnimatedEntry from "@/components/shared/AnimatedEntry";

/**
 * Compute the current week position from system date and semester weeks.
 * Falls back to position 4 if the computed position is not in the weeks array.
 */
function computeCurrentWeek(weeks: SemesterWeek[]): number {
  const now = new Date();
  // Semester 1, 2026 starts Feb 23 (Week 1 Monday)
  const semesterStart = new Date("2026-02-23T00:00:00");
  const weeksDiff = differenceInWeeks(now, semesterStart);
  // Map to position 1-14, clamp
  const pos = Math.max(1, Math.min(14, weeksDiff + 1));
  return weeks.find((w) => w.position === pos) ? pos : 4;
}

/**
 * Classify urgency for deadline badge in the grid overlay.
 */
function classifyDeadlineUrgency(daysRemaining: number): string {
  if (daysRemaining <= 2) return "urgent";
  if (daysRemaining <= 4) return "warning";
  if (daysRemaining <= 7) return "normal";
  return "later";
}

/**
 * TimetablePage orchestrator.
 * Manages week position state, mode toggle, computes current week,
 * wires all grid components with data from hooks, and injects right
 * panel content (MiniCalendar, Upcoming Deadlines, Course Legend) via portal-slot.
 */
export default function TimetablePage() {
  const t = useTranslations("timetable");
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────
  const [weekPosition, setWeekPosition] = useState(4);
  const [mode, setMode] = useState<WeekMode>("week");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // ── Data fetching ──────────────────────────────────────────────
  const weeksQuery = useSemesterWeeks();
  const sessionsQuery = useTimetableSessions();
  const deadlinesQuery = useDeadlines();
  const coursesQuery = useCourses();

  const isLoading =
    weeksQuery.isLoading ||
    sessionsQuery.isLoading ||
    deadlinesQuery.isLoading ||
    coursesQuery.isLoading;
  const isError =
    weeksQuery.isError ||
    sessionsQuery.isError ||
    deadlinesQuery.isError ||
    coursesQuery.isError;

  // ── Portal setup ───────────────────────────────────────────────
  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Initialize weekPosition from computed current week ─────────
  useEffect(() => {
    if (weeksQuery.data?.data) {
      setWeekPosition(computeCurrentWeek(weeksQuery.data.data));
    }
  }, [weeksQuery.data]);

  // ── Semester weeks data ────────────────────────────────────────
  const semesterWeeks = weeksQuery.data?.data ?? [];

  // ── Current week derived state ─────────────────────────────────
  const currentWeek = useMemo(
    () =>
      semesterWeeks.find((w) => w.position === weekPosition) ?? {
        position: weekPosition,
        teaching_week: 0,
        label: "",
        monday_date: "2026-03-16",
      },
    [semesterWeeks, weekPosition]
  );

  const isBreak = currentWeek.teaching_week === 0;

  // Actual current week position from system date
  const actualCurrentPosition = useMemo(
    () => (semesterWeeks.length > 0 ? computeCurrentWeek(semesterWeeks) : 4),
    [semesterWeeks]
  );

  const isCurrentWeekView =
    weekPosition === actualCurrentPosition && mode === "week";

  // ── Filtered sessions ──────────────────────────────────────────
  const allSessions = sessionsQuery.data?.data ?? [];

  const filteredSessions = useMemo(() => {
    if (mode === "all") return allSessions;
    if (isBreak) return [];
    return allSessions.filter((s) =>
      s.weeks.includes(currentWeek.teaching_week)
    );
  }, [allSessions, mode, isBreak, currentWeek.teaching_week]);

  // ── Deadline items for grid overlay ────────────────────────────
  const allDeadlines = deadlinesQuery.data?.data ?? [];

  const deadlineItems: DeadlineItem[] = useMemo(() => {
    return allDeadlines
      .filter((dl) => dl.days_remaining !== undefined && dl.days_remaining >= 0)
      .map((dl) => {
        const dueDate = new Date(dl.due_date);
        const jsDay = dueDate.getDay();
        // Convert to 0=Mon, ..., 6=Sun
        const day = jsDay === 0 ? 6 : jsDay - 1;
        const hour = dueDate.getHours() + dueDate.getMinutes() / 60;

        return {
          id: dl.id,
          title: dl.title,
          course_code: dl.course_code,
          course_name: dl.course_name,
          tag: dl.title.split(" ").slice(0, 2).join(" "),
          urgency: classifyDeadlineUrgency(dl.days_remaining ?? 0),
          day,
          hour: hour || 23.98, // Default to near-midnight if no time
          time_display: format(dueDate, "EEE d/M '\u00b7' h:mm a"),
        };
      });
  }, [allDeadlines]);

  // ── Upcoming deadlines for right panel (first 4) ───────────────
  const upcomingDeadlines = useMemo(() => {
    return allDeadlines
      .filter((dl) => dl.days_remaining !== undefined && dl.days_remaining >= 0)
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )
      .slice(0, 4)
      .map((dl) => ({
        id: dl.id,
        title: dl.title,
        course_id: dl.course_code,
        due_date: dl.due_date,
        days_remaining: dl.days_remaining ?? undefined,
      }));
  }, [allDeadlines]);

  // ── Course list for legend ─────────────────────────────────────
  const courseList = useMemo(() => {
    const courses = coursesQuery.data?.data ?? [];
    return courses.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
    }));
  }, [coursesQuery.data]);

  // ── Date range display ─────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (mode === "all") return t("semesterOverview");
    const monday = new Date(currentWeek.monday_date + "T00:00:00");
    const sunday = addDays(monday, 6);
    return `${format(monday, "dd/MM/yyyy")} \u2014 ${format(sunday, "dd/MM/yyyy")}`;
  }, [mode, currentWeek.monday_date, t]);

  // ── Week label ─────────────────────────────────────────────────
  const weekLabel = useMemo(() => {
    if (isBreak) return t("breakLabel");
    if (currentWeek.teaching_week > 0) {
      return t("weekLabel", { week: currentWeek.teaching_week });
    }
    return currentWeek.label;
  }, [isBreak, currentWeek.teaching_week, currentWeek.label, t]);

  // ── Event handlers ─────────────────────────────────────────────
  const handleWeekChange = useCallback((pos: number) => {
    setWeekPosition(pos);
    setMode("week");
  }, []);

  const handlePrev = useCallback(() => {
    setWeekPosition((prev) => {
      if (prev > 1) {
        setMode("week");
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    setWeekPosition((prev) => {
      if (prev < 14) {
        setMode("week");
        return prev + 1;
      }
      return prev;
    });
  }, []);

  const handleModeChange = useCallback(
    (newMode: WeekMode) => {
      if (newMode === "week") {
        setWeekPosition(actualCurrentPosition);
        setMode("week");
      } else {
        setMode("all");
      }
    },
    [actualCurrentPosition]
  );

  // ── Refresh handler ────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: timetableKeys.all });
  }, [queryClient]);

  // ── Loading state ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-[18px]">
        <AnimatedEntry delay={1}>
          <div className="h-[40px] bg-[#f6f5f0] rounded-[8px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
        </AnimatedEntry>
        <AnimatedEntry delay={2}>
          <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] h-[500px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
        </AnimatedEntry>
        {portalTarget &&
          createPortal(
            <>
              <AnimatedEntry delay={5}>
                <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px] h-[220px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </AnimatedEntry>
              <AnimatedEntry delay={7}>
                <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px] h-[180px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </AnimatedEntry>
              <AnimatedEntry delay={8}>
                <div className="bg-[#f6f5f0] border-[1.5px] border-[#d0cdc4] rounded-[14px] p-[20px] h-[160px] animate-skeleton-shimmer bg-[length:200%_100%] bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]" />
              </AnimatedEntry>
            </>,
            portalTarget
          )}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (isError) {
    return (
      <AnimatedEntry delay={1}>
        <div className="text-center py-[48px] px-[24px] text-[#9b9b94]">
          <Calendar
            size={48}
            className="text-[#e8e5dd] mx-auto mb-[16px]"
          />
          <div className="text-[0.88rem] font-medium text-[#2d2d2a] mb-[8px]">
            {t("errorState")}
          </div>
          <button
            onClick={handleRefresh}
            className="text-[0.78rem] font-semibold py-[6px] px-[16px] rounded-[8px] bg-[rgba(217,119,87,0.11)] text-[#d97757] border-none cursor-pointer hover:bg-[rgba(217,119,87,0.18)] transition-colors duration-150"
          >
            {t("retry")}
          </button>
        </div>
      </AnimatedEntry>
    );
  }

  // ── Main render ────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-3">
        <AnimatedEntry delay={1}>
          <TimetableTitleRow
            weekPosition={weekPosition}
            weekLabel={weekLabel}
            dateRange={dateRange}
            mode={mode}
            onWeekChange={handleWeekChange}
            onPrev={handlePrev}
            onNext={handleNext}
            onModeChange={handleModeChange}
          />
        </AnimatedEntry>
        <AnimatedEntry delay={2}>
          <TimetableGrid
            sessions={filteredSessions}
            deadlines={deadlineItems}
            weekPosition={weekPosition}
            mode={mode}
            currentWeek={currentWeek}
            isBreak={isBreak}
            isCurrentWeekView={isCurrentWeekView}
          />
        </AnimatedEntry>
      </div>
      {portalTarget &&
        createPortal(
          <TimetableRightPanel
            deadlines={upcomingDeadlines}
            courses={courseList}
          />,
          portalTarget
        )}
    </>
  );
}
