"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useGPACourseDetail } from "@/lib/hooks/useGPA";
import { useCourseMaterials, useCourseDiscussions } from "@/lib/hooks/useCourses";
import AssessmentBreakdown from "@/components/courses/AssessmentBreakdown";
import MaterialsFolders from "@/components/courses/MaterialsFolders";
import CourseQA from "@/components/ai/CourseQA";
import UnitReview from "@/components/ai/UnitReview";
import AIHighValuePosts from "@/components/ai/AIHighValuePosts";
import AIErrorBoundary from "@/components/ai/AIErrorBoundary";

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Course detail page with three sections:
 * 1. Assessment breakdown table
 * 2. Course materials (folder accordion)
 * 3. High-value Ed Discussion posts
 */
export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params);

  const { data: detail, isLoading: detailLoading } = useGPACourseDetail(id);
  const { data: materials, isLoading: materialsLoading } = useCourseMaterials(id);
  const { data: posts } = useCourseDiscussions(id);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-1.5 text-sm hover:opacity-80"
        style={{ color: "var(--color-text-2)", textDecoration: "none" }}
      >
        <ArrowLeft size={16} />
        Back to Courses
      </Link>

      {/* Course header */}
      {detail ? (
        <div>
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {detail.course_code}: {detail.course_name}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-2)" }}
          >
            {detail.semester} &middot; {detail.credit_points} credit points
            &middot; WAM: {detail.wam.toFixed(1)} ({detail.grade_band})
          </p>
        </div>
      ) : detailLoading ? (
        <div className="space-y-2">
          <div className="h-7 w-1/3 rounded bg-[var(--color-divider)] animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-[var(--color-divider)] animate-pulse" />
        </div>
      ) : null}

      {/* Assessment Breakdown */}
      {detailLoading ? (
        <div className="h-48 rounded bg-[var(--color-divider)] animate-pulse" />
      ) : detail ? (
        <AssessmentBreakdown
          assessments={detail.assessments}
          weightSource={detail.weight_source}
        />
      ) : null}

      {/* Course Materials */}
      <MaterialsFolders
        materials={materials}
        isLoading={materialsLoading}
      />

      {/* AI-Scored High-Value Posts (replaces basic posts) */}
      <AIErrorBoundary featureName="AI-Scored Posts">
        <AIHighValuePosts
          courseId={id}
          fallbackPosts={posts ?? []}
        />
      </AIErrorBoundary>

      {/* AI Q&A */}
      <AIErrorBoundary featureName="Course Q&A">
        <CourseQA courseId={id} />
      </AIErrorBoundary>

      {/* AI Unit Review */}
      <AIErrorBoundary featureName="Unit Review">
        <UnitReview courseId={id} />
      </AIErrorBoundary>
    </div>
  );
}
