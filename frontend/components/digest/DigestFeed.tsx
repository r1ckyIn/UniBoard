"use client";

import { useMemo } from "react";
import { format, subDays, addDays } from "date-fns";
import DigestCard, { type DigestDay } from "./DigestCard";
import { useGPASummary } from "@/lib/hooks/useGPA";
import { useDeadlines } from "@/lib/hooks/useDeadlines";
import { useCourseDiscussions } from "@/lib/hooks/useCourses";
import { useLatestDigest } from "@/lib/hooks/useDigest";
import type {
  DeadlineResponse,
  HighValuePostResponse,
  DigestItemResponse,
} from "@/lib/api/types";

/**
 * Client-side aggregation of grades, deadlines, and Ed posts into daily digest cards.
 * Phase 4: Uses API digest when available, falls back to client-side aggregation.
 */
export default function DigestFeed() {
  // API digest (Phase 4)
  const { data: apiDigest, isLoading: digestLoading, isError: digestError } = useLatestDigest();

  // Fallback: client-side aggregation (Phase 3 behavior)
  const { data: summary, isLoading: gpLoading } = useGPASummary();

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

  const firstCourseId = summary?.courses?.[0]?.course_id ?? "";
  const { data: posts, isLoading: postsLoading } = useCourseDiscussions(firstCourseId);

  // Use API digest if available, otherwise fall back to client-side
  const useApiDigest = !digestError && apiDigest != null;
  const isLoading = digestLoading || (!useApiDigest && (gpLoading || dlLoading || postsLoading));

  // Convert API digest items into DigestDay format
  const apiDays: DigestDay[] = useMemo(() => {
    if (!apiDigest) return [];

    const dayMap = new Map<string, DigestDay>();
    const ensureDay = (dateStr: string): DigestDay => {
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { date: dateStr, grades: [], deadlines: [], posts: [] });
      }
      return dayMap.get(dateStr)!;
    };

    for (const item of apiDigest.items as DigestItemResponse[]) {
      const dateKey = apiDigest.digest_date.split("T")[0];
      const day = ensureDay(dateKey);

      if (item.type === "grade") {
        day.grades.push({
          assessment_name: item.title,
          score: 0,
          max_score: 100,
          course_code: item.course_code,
          urgency_score: item.urgency_score,
        });
      }
      // Deadlines and posts from API digest are summarized; show as grades for simplicity
    }

    return Array.from(dayMap.values()).filter(
      (d) => d.grades.length > 0 || d.deadlines.length > 0 || d.posts.length > 0
    );
  }, [apiDigest]);

  // Fallback: client-side aggregation
  const fallbackDays: DigestDay[] = useMemo(() => {
    const dayMap = new Map<string, DigestDay>();

    const ensureDay = (dateStr: string): DigestDay => {
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, { date: dateStr, grades: [], deadlines: [], posts: [] });
      }
      return dayMap.get(dateStr)!;
    };

    if (deadlines) {
      for (const d of deadlines as DeadlineResponse[]) {
        const dateKey = d.due_date.split("T")[0];
        ensureDay(dateKey).deadlines.push(d);
      }
    }

    if (posts) {
      for (const p of posts as HighValuePostResponse[]) {
        const dateKey = p.created_at.split("T")[0];
        ensureDay(dateKey).posts.push(p);
      }
    }

    if (summary?.courses) {
      for (const c of summary.courses) {
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

    return Array.from(dayMap.values())
      .filter((d) => d.grades.length > 0 || d.deadlines.length > 0 || d.posts.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [summary, deadlines, posts, today]);

  const days = useApiDigest ? apiDays : fallbackDays;
  const aiSummary = useApiDigest ? apiDigest?.ai_summary : null;

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
      {!useApiDigest && (
        <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
          Showing rule-based digest. AI-enhanced version will appear after daily generation.
        </p>
      )}
      {days.map((day, idx) => (
        <DigestCard
          key={day.date}
          day={day}
          ai_summary={idx === 0 ? aiSummary : undefined}
        />
      ))}
    </div>
  );
}
