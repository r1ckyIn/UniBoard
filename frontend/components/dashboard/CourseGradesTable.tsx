"use client";

import Link from "next/link";
import RoughCard from "@/components/design-system/RoughCard";
import RoughProgressBar from "@/components/design-system/RoughProgressBar";
import type { CourseSummary } from "@/lib/api/types";
import { gradeBandColor } from "@/lib/utils/gpa";

interface CourseGradesTableProps {
  courses: CourseSummary[];
  isLoading: boolean;
}

/**
 * Four-column course grades table with progress bars and grade band badges.
 * Each row links to the course detail page.
 */
export default function CourseGradesTable({
  courses,
  isLoading,
}: CourseGradesTableProps) {
  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3
          className="text-lg mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Course Grades
        </h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Course Grades
      </h3>

      {courses.length === 0 ? (
        <p style={{ color: "var(--color-text-3)" }}>
          No courses synced yet. Connect Canvas in Settings.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase tracking-wider"
                style={{ color: "var(--color-text-3)" }}
              >
                <th className="pb-3 pr-3">Course</th>
                <th className="pb-3 pr-3">Assessed</th>
                <th className="pb-3 pr-3">Earned</th>
                <th className="pb-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.course_id}
                  className="group border-t"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  {/* Course column */}
                  <td className="py-3 pr-3">
                    <Link
                      href={`/courses/${course.course_id}`}
                      className="block hover:opacity-80"
                      style={{ textDecoration: "none" }}
                    >
                      <span
                        className="block font-medium text-sm"
                        style={{ color: "var(--color-text-1)" }}
                      >
                        {course.course_code}
                      </span>
                      <span
                        className="block text-xs"
                        style={{ color: "var(--color-text-2)" }}
                      >
                        {course.course_name}
                      </span>
                    </Link>
                  </td>

                  {/* Assessed progress */}
                  <td className="py-3 pr-3" style={{ minWidth: "100px" }}>
                    <RoughProgressBar
                      value={course.pct_assessed * 100}
                      color="var(--color-amber)"
                    />
                    <span
                      className="text-xs mt-1 block"
                      style={{ color: "var(--color-text-3)" }}
                    >
                      {(course.pct_assessed * 100).toFixed(0)}%
                    </span>
                  </td>

                  {/* Earned WAM */}
                  <td className="py-3 pr-3">
                    <span
                      className="font-semibold"
                      style={{ color: gradeBandColor(course.grade_band) }}
                    >
                      {course.wam.toFixed(1)}
                    </span>
                  </td>

                  {/* Grade band badge */}
                  <td className="py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${gradeBandColor(course.grade_band)} 12%, transparent)`,
                        color: gradeBandColor(course.grade_band),
                      }}
                    >
                      {course.grade_band}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </RoughCard>
  );
}
