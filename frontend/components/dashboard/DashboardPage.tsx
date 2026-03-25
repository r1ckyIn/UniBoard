"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { format } from "date-fns";

// Hooks
import { useGpaReport } from "@/hooks/use-gpa";
import { useCourses, useCourseDetail } from "@/hooks/use-courses";
import { useUpcomingDeadlines } from "@/hooks/use-deadlines";
import { useNotifications, useAlerts } from "@/hooks/use-notifications";
import { useCurrentUser } from "@/hooks/use-user";
import { useAuthStore } from "@/lib/auth/store";
import { getGradeBand } from "@/lib/utils/grade-band";
import { mapNotificationToActivity } from "@/lib/notifications/map-to-activity";

// Components
import HeroSection from "@/components/dashboard/HeroSection";
import StatsRow from "@/components/dashboard/StatsRow";
import CourseGradesTable from "@/components/dashboard/CourseGradesTable";
import SkeletonCard from "@/components/dashboard/SkeletonCard";
import ProfileCard from "@/components/dashboard/ProfileCard";
import MiniCalendar from "@/components/dashboard/MiniCalendar";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import { withClientOnly } from "@/components/design-system/ClientOnly";

// SSR-safe Rough.js components
const DeadlineTimeline = withClientOnly(
  () => import("@/components/dashboard/DeadlineTimeline")
);
const AssessmentDonut = withClientOnly(
  () => import("@/components/dashboard/AssessmentDonut")
);

// Type imports
import type { DeadlineItem } from "@/components/dashboard/DeadlineTimeline";
import type { AssessmentWeight } from "@/components/dashboard/AssessmentDonut";

/**
 * Compute urgency level based on days_remaining.
 * <=1 = urgent, <=7 = soon, >7 = later
 */
function computeUrgency(daysRemaining: number): "urgent" | "soon" | "later" {
  if (daysRemaining <= 1) return "urgent";
  if (daysRemaining <= 7) return "soon";
  return "later";
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // ── Hook calls (parallel fetching via TanStack Query) ──────────
  const gpa = useGpaReport();
  const courses = useCourses();
  const deadlines = useUpcomingDeadlines();
  const notifications = useNotifications();
  const alerts = useAlerts();
  const user = useCurrentUser();
  const authUser = useAuthStore((s) => s.user);

  // ── Cross-card state: Deadline <-> Donut ───────────────────────
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(
    null
  );

  // ── Portal target for right panel ─────────────────────────────
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Scroll handling ───────────────────────────────────────────
  const statsRef = useRef<HTMLDivElement>(null);
  const handleScrollToStats = useCallback(() => {
    if (typeof statsRef.current?.scrollIntoView === "function") {
      statsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // ── Data transformations ──────────────────────────────────────

  // Deadline items for the timeline
  const deadlineItems = useMemo<DeadlineItem[]>(() => {
    const raw = deadlines.data?.data ?? [];
    return raw
      .filter((d) => d.days_remaining >= 0) // Only upcoming, not overdue
      .slice(0, 5) // Show at most 5
      .map((d) => ({
        id: d.id,
        title: d.title,
        course_code: d.course_code,
        days_remaining: d.days_remaining,
        weight: d.weight ?? 0,
        urgency: computeUrgency(d.days_remaining),
      }));
  }, [deadlines.data]);

  // Determine which course's donut to show
  const nearestDeadline = deadlineItems[0] ?? null;
  const selectedDeadline = selectedDeadlineId
    ? deadlineItems.find((d) => d.id === selectedDeadlineId)
    : null;
  const donutCourseCode =
    selectedDeadline?.course_code ??
    nearestDeadline?.course_code ??
    null;

  // Find the course ID from course code so we can use useCourseDetail
  const donutCourseId = useMemo(() => {
    if (!donutCourseCode) return null;
    const courseList = courses.data?.data ?? [];
    const found = courseList.find((c) => c.code === donutCourseCode);
    return found?.id ?? null;
  }, [donutCourseCode, courses.data]);

  // Fetch course detail for the donut (assessment weights)
  const courseDetail = useCourseDetail(donutCourseId ?? "");
  const donutWeights = useMemo<AssessmentWeight[]>(() => {
    if (!donutCourseId || !courseDetail.data) return [];
    const detail = courseDetail.data.data;
    return detail.assessment_weights.map((aw) => ({
      name: aw.name,
      weight: aw.weight,
      status: aw.status,
      group_name: aw.group_name,
    }));
  }, [donutCourseId, courseDetail.data]);

  // Course grades for table
  const courseGrades = useMemo(() => {
    const gpaCourses = gpa.data?.data?.courses ?? [];
    return gpaCourses.map((c) => ({
      course_id: c.course_id,
      code: c.code,
      name: c.name,
      current_mark: c.current_mark,
      grade_letter: c.grade_letter,
      completed_weight: c.completed_weight,
    }));
  }, [gpa.data]);

  // Stats row data
  const statsData = useMemo(() => {
    const report = gpa.data?.data;
    const alertList = alerts.data?.data ?? [];
    const firstCourseAlert = alertList.find((a) => a.course_code);
    const deadlineAlerts = alertList.filter(
      (a) => a.type === "deadline_risk"
    );

    return {
      wam: report?.current_wam ?? 0,
      target: report?.target_wam ?? 0,
      gradeBand: getGradeBand(report?.target_wam ?? 0),
      alertCount: alertList.length,
      alertCourse: firstCourseAlert?.course_code ?? "",
      alertDeadlineCount: deadlineAlerts.length,
    };
  }, [gpa.data, alerts.data]);

  // Calendar deadline days: group upcoming deadlines by date, sum weights
  const calendarDeadlineDays = useMemo(() => {
    const raw = deadlines.data?.data ?? [];
    const dayMap = new Map<string, number>();
    for (const d of raw) {
      if (d.days_remaining < 0) continue;
      const dateKey = format(new Date(d.due_date), "yyyy-MM-dd");
      dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + (d.weight ?? 0));
    }
    return Array.from(dayMap.entries()).map(([date, totalWeight]) => ({
      date,
      totalWeight,
    }));
  }, [deadlines.data]);

  // Activities: derive from notifications
  const recentActivities = useMemo(() => {
    const notifs = notifications.data?.data ?? [];
    return notifs.slice(0, 5).map((n) => mapNotificationToActivity(n, t));
  }, [notifications.data, t]);

  // Profile card data
  const profileData = useMemo(() => {
    const userData = user.data?.data;
    const courseList = courses.data?.data ?? [];
    const totalCredits = courseList.reduce(
      (sum, c) => sum + c.credit_points,
      0
    );

    return {
      name: userData?.display_name ?? authUser?.displayName ?? "Student",
      faculty: "Faculty of Science",
      year: 3,
      semester: 1,
      courseCount: courseList.length,
      creditPoints: totalCredits,
    };
  }, [user.data, courses.data, authUser]);

  // ── Event handlers ────────────────────────────────────────────
  const handleDeadlineClick = useCallback((id: string) => {
    setSelectedDeadlineId((prev) => (prev === id ? null : id));
  }, []);

  const handleSeeDetails = useCallback(
    (id: string) => {
      const dl = deadlineItems.find((d) => d.id === id);
      if (dl) {
        // Approximate due date from days_remaining
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dl.days_remaining);
        router.push(`/deadlines?date=${format(dueDate, "yyyy-MM-dd")}`);
      }
    },
    [deadlineItems, router]
  );

  const handleCalendarDateClick = useCallback(
    (date: Date) => {
      router.push(`/deadlines?date=${format(date, "yyyy-MM-dd")}`);
    },
    [router]
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Hero Section */}
        <HeroSection
          userName={authUser?.displayName ?? "Student"}
          onScrollClick={handleScrollToStats}
        />

        {/* Stats Row */}
        <div
          ref={statsRef}
          id="dashboard-start"
          className="scroll-mt-[calc(var(--spacing-header-h)+20px)]"
        >
          {gpa.isLoading ? (
            <div className="grid grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} variant="stat" />
              ))}
            </div>
          ) : (
            <StatsRow
              wam={statsData.wam}
              target={statsData.target}
              gradeBand={statsData.gradeBand}
              alertCount={statsData.alertCount}
              alertCourse={statsData.alertCourse}
              alertDeadlineCount={statsData.alertDeadlineCount}
            />
          )}
        </div>

        {/* Course Grades Table */}
        {gpa.isLoading ? (
          <SkeletonCard variant="table" />
        ) : (
          <CourseGradesTable courses={courseGrades} />
        )}

        {/* Bottom row: Deadlines + Donut */}
        <div className="grid grid-cols-1 min-[900px]:grid-cols-2 gap-6">
          <AnimatedEntry delay={5} className="h-full">
            {deadlines.isLoading ? (
              <SkeletonCard variant="timeline" />
            ) : (
              <DeadlineTimeline
                deadlines={deadlineItems}
                selectedDeadlineId={selectedDeadlineId}
                onDeadlineClick={handleDeadlineClick}
                onSeeDetails={handleSeeDetails}
              />
            )}
          </AnimatedEntry>

          <AnimatedEntry delay={6} className="h-full">
            {deadlines.isLoading || courseDetail.isLoading ? (
              <SkeletonCard variant="donut" />
            ) : (
              <AssessmentDonut
                weights={donutWeights}
                highlightType={
                  selectedDeadline
                    ? selectedDeadline.title
                    : undefined
                }
                courseCode={donutCourseCode ?? ""}
              />
            )}
          </AnimatedEntry>
        </div>
      </div>

      {/* Right panel content via portal */}
      {portalTarget &&
        createPortal(
          <>
            <AnimatedEntry delay={8}>
              {user.isLoading || courses.isLoading ? (
                <SkeletonCard variant="profile" />
              ) : (
                <ProfileCard
                  name={profileData.name}
                  faculty={profileData.faculty}
                  year={profileData.year}
                  semester={profileData.semester}
                  courseCount={profileData.courseCount}
                  creditPoints={profileData.creditPoints}
                />
              )}
            </AnimatedEntry>

            <AnimatedEntry delay={9}>
              {deadlines.isLoading ? (
                <SkeletonCard variant="calendar" />
              ) : (
                <MiniCalendar
                  deadlineDays={calendarDeadlineDays}
                  onDateClick={handleCalendarDateClick}
                />
              )}
            </AnimatedEntry>

            <AnimatedEntry delay={10}>
              {notifications.isLoading ? (
                <SkeletonCard variant="activity" />
              ) : (
                <RecentActivity activities={recentActivities} />
              )}
            </AnimatedEntry>
          </>,
          portalTarget
        )}
    </>
  );
}
