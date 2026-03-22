"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { BookOpen } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import { getCourseColor } from "@/lib/dashboard/course-colors";

const RoughProgressBar = withClientOnly(
  () => import("@/components/dashboard/RoughProgressBar")
);

interface CourseGrade {
  course_id: string;
  code: string;
  name: string;
  current_mark: number | null;
  grade_letter: string | null;
  completed_weight: number;
  target_mark?: number;
}

interface CourseGradesTableProps {
  courses: CourseGrade[];
}

export default function CourseGradesTable({ courses }: CourseGradesTableProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const handleRowClick = (courseId: string) => {
    router.push(`/courses/${courseId}`);
  };

  const handlePredictClick = (
    e: React.MouseEvent,
    courseId: string
  ) => {
    e.stopPropagation();
    router.push(`/predict?course=${courseId}`);
  };

  return (
    <AnimatedEntry delay={4}>
      <RoughCard>
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-orange" strokeWidth={2} />
            <h2
              className="font-serif text-text-1"
              style={{ fontSize: "0.95rem", fontWeight: 600 }}
            >
              {t("grades.title")}
            </h2>
          </div>
          <span
            className="rounded"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              padding: "1px 8px",
              borderRadius: "4px",
              backgroundColor: "var(--color-orange-soft)",
              color: "var(--color-orange)",
            }}
          >
            {t("grades.badge", { year: "2026", semester: "1" })}
          </span>
        </div>

        {/* Table */}
        <table className="w-full" style={{ tableLayout: "fixed", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                className="text-left text-text-3 uppercase"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 12px",
                }}
              >
                {t("grades.th.course")}
              </th>
              <th
                className="text-center text-text-3 uppercase"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 12px",
                }}
              >
                {t("grades.th.assessed")}
              </th>
              <th
                className="text-center text-text-3 uppercase"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 12px",
                }}
              >
                {t("grades.th.earned")}
              </th>
              <th
                className="text-right text-text-3 uppercase"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 12px",
                }}
              >
                {t("grades.th.target")}
              </th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course, idx) => {
              const { base, soft } = getCourseColor(course.code);
              const isLast = idx === courses.length - 1;

              return (
                <tr
                  key={course.course_id}
                  onClick={() => handleRowClick(course.course_id)}
                  className="group cursor-pointer transition-colors duration-150"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--color-divider)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(217,119,87,.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Course */}
                  <td style={{ padding: "16px 12px" }}>
                    <span
                      className="text-text-1"
                      style={{ fontWeight: 600, fontSize: "0.82rem" }}
                    >
                      {course.code}
                    </span>
                    <span
                      className="block text-text-3"
                      style={{ fontSize: "12px" }}
                    >
                      {course.name}
                    </span>
                  </td>

                  {/* Assessed (progress bar + percentage) */}
                  <td className="text-center" style={{ padding: "16px 12px" }}>
                    <div className="flex flex-col items-center">
                      <RoughProgressBar
                        progress={course.completed_weight}
                        color={base}
                        width={120}
                        height={14}
                      />
                      <span
                        className="text-text-3 mt-1"
                        style={{ fontSize: "12px" }}
                      >
                        {Math.round(course.completed_weight * 100)}%
                      </span>
                    </div>
                  </td>

                  {/* Earned (mark percentage) */}
                  <td className="text-center" style={{ padding: "16px 12px" }}>
                    {course.current_mark !== null ? (
                      <span
                        className="font-serif"
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 600,
                          color: base,
                        }}
                      >
                        {course.current_mark}%
                      </span>
                    ) : (
                      <span className="text-text-3" style={{ fontSize: "1.05rem" }}>
                        &mdash;
                      </span>
                    )}
                  </td>

                  {/* Target badge + predict link */}
                  <td className="text-right" style={{ padding: "16px 12px" }}>
                    <div className="flex items-center justify-end gap-2">
                      {course.grade_letter && (
                        <span
                          className="rounded"
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "1px 8px",
                            borderRadius: "6px",
                            backgroundColor: soft,
                            color: base,
                          }}
                        >
                          {course.grade_letter}
                        </span>
                      )}
                      <button
                        onClick={(e) => handlePredictClick(e, course.course_id)}
                        className="ml-2 opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer"
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--color-orange)",
                          transition: "opacity 0.4s ease",
                        }}
                        aria-label={`Predict ${course.code} grade`}
                      >
                        {t("grades.predictLink")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </RoughCard>
    </AnimatedEntry>
  );
}
