import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { courses } from "@/lib/fixtures/courses";
import { deadlines } from "@/lib/fixtures/deadlines";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError(
      "INTERNAL_ERROR",
      "Failed to retrieve course deadlines",
      500
    );
  }

  const { id } = await params;

  // Look up course to find the course_code
  const course = courses.find((c) => c.id === id);
  if (!course) {
    return mockError("NOT_FOUND", "Course not found", 404);
  }

  // Filter deadlines by course_code, returning CourseDeadline shape
  const courseDeadlines = deadlines
    .filter((d) => d.course_code === course.code)
    .map((d) => ({
      id: d.id,
      title: d.title,
      due_date: d.due_date,
      source: d.source,
      weight: d.weight,
      status: d.status,
      days_remaining: d.days_remaining,
    }));

  return mockResponse(courseDeadlines);
}
