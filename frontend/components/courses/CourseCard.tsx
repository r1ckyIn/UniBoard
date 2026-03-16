"use client";

import Link from "next/link";
import RoughCard from "@/components/design-system/RoughCard";
import RoughProgressBar from "@/components/design-system/RoughProgressBar";
import type { CourseSummary } from "@/lib/api/types";
import { gradeBandColor } from "@/lib/utils/gpa";

interface CourseCardProps {
  course: CourseSummary;
}

/**
 * Course summary card with WAM, progress bar, and grade band.
 * Entire card is a link to the course detail page.
 */
export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.course_id}`}
      className="block"
      style={{ textDecoration: "none" }}
    >
      <RoughCard className="p-5 bg-[var(--color-card-bg)] transition-transform hover:scale-[1.01] hover:shadow-[var(--shadow-card-hover)]">
        {/* Header */}
        <div className="mb-3">
          <h3
            className="text-base font-semibold"
            style={{
              fontFamily: "var(--font-serif)",
              color: "var(--color-text-1)",
              fontSize: "1.1rem",
            }}
          >
            {course.course_code}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-2)" }}
          >
            {course.course_name}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-end gap-4 mb-3">
          {/* WAM */}
          <div>
            <p
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-serif)",
                color: gradeBandColor(course.grade_band),
              }}
            >
              {course.wam.toFixed(1)}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-3)" }}
            >
              WAM
            </p>
          </div>

          {/* Assessed progress */}
          <div className="flex-1">
            <RoughProgressBar
              value={course.pct_assessed * 100}
              color="var(--color-amber)"
            />
            <p
              className="text-xs mt-1"
              style={{ color: "var(--color-text-3)" }}
            >
              {(course.pct_assessed * 100).toFixed(0)}% assessed
            </p>
          </div>

          {/* Grade band badge */}
          <span
            className="inline-block px-2 py-0.5 rounded text-xs font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, ${gradeBandColor(course.grade_band)} 12%, transparent)`,
              color: gradeBandColor(course.grade_band),
            }}
          >
            {course.grade_band}
          </span>
        </div>

        {/* Footer */}
        <p
          className="text-xs"
          style={{ color: "var(--color-text-3)" }}
        >
          {course.assessment_count} assessments, {course.graded_count} graded
        </p>
      </RoughCard>
    </Link>
  );
}
