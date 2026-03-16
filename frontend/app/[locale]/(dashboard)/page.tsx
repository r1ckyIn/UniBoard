"use client";

import { useGPASummary, useGPATrend } from "@/lib/hooks/useGPA";
import { useDeadlines } from "@/lib/hooks/useDeadlines";
import { useCurrentUser } from "@/lib/hooks/useUser";
import HeroSection from "@/components/dashboard/HeroSection";
import StatsRow from "@/components/dashboard/StatsRow";
import CourseGradesTable from "@/components/dashboard/CourseGradesTable";
import DeadlineTimeline from "@/components/dashboard/DeadlineTimeline";
import WeightDonut from "@/components/dashboard/WeightDonut";

/**
 * Dashboard page: 100vh hero section followed by below-fold data sections.
 * Fetches GPA summary, deadlines, user profile, and trend data via TanStack Query.
 */
export default function DashboardPage() {
  const { data: gpa, isLoading: gpaLoading } = useGPASummary();
  const { data: deadlines, isLoading: dlLoading } = useDeadlines();
  const { data: user } = useCurrentUser();
  useGPATrend(); // pre-fetch trend data

  const urgentCount =
    deadlines?.filter((d) => d.urgency === "urgent").length ?? 0;

  return (
    <>
      <HeroSection
        displayName={user?.display_name ?? "Student"}
        wam={gpa?.cumulative_wam}
      />

      <div id="dashboard-data" className="space-y-8 pb-16">
        <StatsRow
          wam={gpa?.cumulative_wam}
          target={user?.gpa_target}
          urgentCount={urgentCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CourseGradesTable
            courses={gpa?.courses ?? []}
            isLoading={gpaLoading}
          />
          <div className="space-y-6">
            <DeadlineTimeline
              deadlines={deadlines ?? []}
              isLoading={dlLoading}
            />
            <WeightDonut courses={gpa?.courses ?? []} />
          </div>
        </div>
      </div>
    </>
  );
}
