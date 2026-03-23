"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

// Hooks
import { useCourseDetail } from "@/hooks/use-courses";
import { useCourseMaterials } from "@/hooks/use-materials";
import { getCourseColor } from "@/lib/dashboard/course-colors";

// Components
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import CourseBanner from "@/components/course-detail/CourseBanner";
import AssessmentSection from "@/components/course-detail/AssessmentSection";
import MaterialsSection from "@/components/course-detail/MaterialsSection";
import AiChatPlaceholder from "@/components/course-detail/AiChatPlaceholder";
import QuickLinksPanel from "@/components/course-detail/QuickLinksPanel";
import CourseDeadlinesPanel from "@/components/course-detail/CourseDeadlinesPanel";
import EdPostsPanel from "@/components/course-detail/EdPostsPanel";

interface CourseDetailPageProps {
  courseId: string;
}

/**
 * Main orchestrator for the Course Detail page.
 * Fetches course data, manages prediction state locally,
 * renders left column components and injects right panel
 * content via portal-slot pattern.
 */
export default function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  const t = useTranslations("courseDetail");
  const router = useRouter();

  // ── Data fetching ──
  const courseDetail = useCourseDetail(courseId);
  const materials = useCourseMaterials(courseId);

  // ── Prediction state (local, resets on navigation) ──
  const [predictions, setPredictions] = useState<
    Record<number, number | null>
  >({});

  const handlePredictionChange = useCallback(
    (index: number, value: string) => {
      if (value === "") {
        setPredictions((prev) => ({ ...prev, [index]: null }));
        return;
      }
      const num = Number(value);
      if (isNaN(num)) return;
      // Clamp to 0-100
      const clamped = Math.min(100, Math.max(0, num));
      setPredictions((prev) => ({ ...prev, [index]: clamped }));
    },
    []
  );

  // ── Portal for right panel ──
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Course color ──
  const courseColor = useMemo(() => {
    if (!courseDetail.data) return { base: "#6a9bcc", soft: "rgba(106,155,204,.11)" };
    return getCourseColor(courseDetail.data.data.code);
  }, [courseDetail.data]);

  // ── CSS custom properties for course color ──
  const colorStyle = {
    "--course-color": courseColor.base,
    "--course-soft": courseColor.soft,
  } as React.CSSProperties;

  // ── Loading state ──
  if (courseDetail.isLoading) {
    return (
      <div
        className="flex items-center justify-center py-20"
        style={colorStyle}
      >
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-3)]" />
      </div>
    );
  }

  // ── Error state ──
  if (courseDetail.error || !courseDetail.data) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3"
        style={colorStyle}
      >
        <AlertCircle className="w-10 h-10 text-[var(--text-3)]" />
        <p className="text-sm text-[var(--text-3)]">{t("empty.noCourse")}</p>
        <button
          onClick={() => router.push("/courses")}
          className="text-sm font-medium text-[#d97757] hover:underline"
        >
          {t("backLink")}
        </button>
      </div>
    );
  }

  const course = courseDetail.data.data;

  return (
    <div className="flex flex-col gap-5" style={colorStyle}>
      {/* Back link */}
      <AnimatedEntry delay={1}>
        <button
          onClick={() => router.push("/courses")}
          className="inline-flex items-center gap-1.5 text-[.82rem] font-medium text-[var(--text-2)] hover:text-[var(--course-color)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backLink")}
        </button>
      </AnimatedEntry>

      {/* Course Banner */}
      <AnimatedEntry delay={2}>
        <CourseBanner
          courseCode={course.code}
          courseName={course.name}
          semester={course.semester}
          creditPoints={course.credit_points}
          courseColor={courseColor.base}
          patternIndex={course.code.charCodeAt(course.code.length - 1) % 5}
        />
      </AnimatedEntry>

      {/* Assessment Section (with merged Grade Summary) */}
      <AnimatedEntry delay={3}>
        <AssessmentSection
          assessments={course.assessment_weights}
          predictions={predictions}
          onPredictionChange={handlePredictionChange}
          courseColor={courseColor.base}
          courseSoft={courseColor.soft}
          semester={course.semester}
        />
      </AnimatedEntry>

      {/* Materials Section */}
      <AnimatedEntry delay={6}>
        <MaterialsSection
          materials={materials.data?.data ?? []}
          courseColor={courseColor.base}
          courseSoft={courseColor.soft}
        />
      </AnimatedEntry>

      {/* AI Chat Placeholder */}
      <AnimatedEntry delay={7}>
        <AiChatPlaceholder courseCode={course.code} />
      </AnimatedEntry>

      {/* Right Panel Content (via portal) */}
      {portalTarget &&
        createPortal(
          <>
            <AnimatedEntry delay={5}>
              <QuickLinksPanel
                courseCode={course.code}
                canvasCourseId={course.canvas_course_id ?? ""}
                edCourseId={course.ed_course_id ?? ""}
              />
            </AnimatedEntry>
            <AnimatedEntry delay={6}>
              <CourseDeadlinesPanel
                courseId={courseId}
                courseColor={courseColor.base}
                courseSoft={courseColor.soft}
              />
            </AnimatedEntry>
            <AnimatedEntry delay={7}>
              <EdPostsPanel
                courseId={courseId}
                edCourseId={course.ed_course_id ?? ""}
              />
            </AnimatedEntry>
          </>,
          portalTarget
        )}
    </div>
  );
}
