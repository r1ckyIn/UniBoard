"use client";

interface CourseDetailPageProps {
  courseId: string;
}

/** Placeholder component — full implementation in Plan 03 */
export default function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  return <div data-testid="course-detail-page">Course Detail Placeholder: {courseId}</div>;
}
