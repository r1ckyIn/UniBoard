"use client";

import { useGPASummary } from "@/lib/hooks/useGPA";
import CourseCard from "@/components/courses/CourseCard";
import RoughCard from "@/components/design-system/RoughCard";
import Link from "next/link";

/**
 * Courses list page showing a card grid of all enrolled courses.
 * Data sourced from GPA summary to display WAM, progress, and grade band per course.
 */
export default function CoursesPage() {
  const { data: gpa, isLoading } = useGPASummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Your Courses
        </h1>
        {gpa && gpa.courses.length > 0 && (
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-2)" }}
          >
            {gpa.course_count} courses, {gpa.total_credit_points} credit points
          </p>
        )}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <RoughCard key={i} className="p-5 bg-[var(--color-card-bg)]">
              <div className="space-y-3">
                <div className="h-5 w-1/3 rounded bg-[var(--color-divider)] animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-[var(--color-divider)] animate-pulse" />
                <div className="h-3 w-full rounded bg-[var(--color-divider)] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[var(--color-divider)] animate-pulse" />
              </div>
            </RoughCard>
          ))}
        </div>
      ) : gpa && gpa.courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gpa.courses.map((course) => (
            <CourseCard key={course.course_id} course={course} />
          ))}
        </div>
      ) : (
        <RoughCard className="p-8 bg-[var(--color-card-bg)] text-center">
          <p style={{ color: "var(--color-text-2)" }}>
            No courses found.{" "}
            <Link
              href="/settings"
              style={{ color: "var(--color-orange)", textDecoration: "underline" }}
            >
              Sync your Canvas data in Settings.
            </Link>
          </p>
        </RoughCard>
      )}
    </div>
  );
}
