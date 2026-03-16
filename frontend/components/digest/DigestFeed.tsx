"use client";

import { useMemo } from "react";
import { format, subDays, addDays } from "date-fns";
import DigestCard, { type DigestDay } from "./DigestCard";
import { useGPASummary } from "@/lib/hooks/useGPA";
import { useDeadlines } from "@/lib/hooks/useDeadlines";
import { useCourseDiscussions } from "@/lib/hooks/useCourses";
import type { DeadlineResponse, HighValuePostResponse } from "@/lib/api/types";

/**
 * Client-side aggregation of grades, deadlines, and Ed posts into daily digest cards.
 * Groups all data by date, sorts by most recent first.
 *
 * Phase 3 version: Rule-based chronological aggregation (no AI scoring).
 */
export default function DigestFeed() {
  const { data: summary, isLoading: gpLoading } = useGPASummary();

  // Memoize date range to avoid re-creating on every render
  const { fromDate, toDate, today } = useMemo(() => {
    const now = new Date();
    return {
      fromDate: format(subDays(now, 7), "yyyy-MM-dd"),
      toDate: format(addDays(now, 7), "yyyy-MM-dd"),
      today: format(now, "yyyy-MM-dd"),
    };
  }, []);

  const { data: deadlines, isLoading: dlLoading } = useDeadlines({
    from_date: fromDate,
    to_date: toDate,
    include_past: true,
  });

  // Fetch discussions for all courses
  // We pick the first course with data as a representative feed
  const firstCourseId = summary?.courses?.[0]?.course_id ?? "";
  const { data: posts, isLoading: postsLoading } = useCourseDiscussions(firstCourseId);

  const isLoading = gpLoading || dlLoading || postsLoading;

  // Aggregate data into daily cards
  const days: DigestDay[] = useMemo(() => {
    const dayMap = new Map<string, DigestDay>();

    const ensureDay = (dateStr: string): DigestDay => {
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { date: dateStr, grades: [], deadlines: [], posts: [] });
      }
      return dayMap.get(dateStr)!;
    };

    // Group deadlines by due date
    if (deadlines) {
      for (const d of deadlines as DeadlineResponse[]) {
        const dateKey = d.due_date.split("T")[0];
        ensureDay(dateKey).deadlines.push(d);
      }
    }

    // Group posts by created_at date
    if (posts) {
      for (const p of posts as HighValuePostResponse[]) {
        const dateKey = p.created_at.split("T")[0];
        ensureDay(dateKey).posts.push(p);
      }
    }

    // Grades: since we don't have graded_at timestamps, show recent
    // graded assessments under today's date
    if (summary?.courses) {
      for (const c of summary.courses) {
        // Indicate that this course has graded assessments
        if (c.graded_count > 0) {
          ensureDay(today).grades.push({
            assessment_name: `${c.course_name} progress`,
            score: Math.round(c.wam),
            max_score: 100,
            course_code: c.course_code,
          });
        }
      }
    }

    // Sort by date descending (newest first)
    return Array.from(dayMap.values())
      .filter((d) => d.grades.length > 0 || d.deadlines.length > 0 || d.posts.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [summary, deadlines, posts, today]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--radius-card)]"
            style={{ background: "var(--color-card-bg)" }}
          />
        ))}
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-[var(--radius-card)]"
        style={{ background: "var(--color-card-bg)" }}
      >
        <p style={{ color: "var(--color-text-3)" }}>
          No recent activity to show. Data will appear after your first sync.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
        This is your rule-based digest. AI-enhanced digest with urgency scoring coming in Phase 4.
      </p>
      {days.map((day) => (
        <DigestCard key={day.date} day={day} />
      ))}
    </div>
  );
}
