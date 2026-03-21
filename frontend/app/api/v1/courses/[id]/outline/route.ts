import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { courseDetails } from "@/lib/fixtures/courses";
import type { components } from "@/lib/api/types.gen";

type CourseOutline = components["schemas"]["CourseOutline"];

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
      "Failed to retrieve course outline",
      500
    );
  }

  const { id } = await params;
  const detail = courseDetails[id];

  if (!detail) {
    return mockError("NOT_FOUND", "Course not found", 404);
  }

  const outline: CourseOutline = {
    course_id: id,
    outline_url: `https://www.sydney.edu.au/units/${detail.code}`,
    assessments: detail.assessment_weights.map((aw) => ({
      name: aw.name,
      weight: aw.weight,
      description: `${aw.name} for ${detail.code}`,
      due_date: aw.due_date,
    })),
    learning_outcomes: [
      `Demonstrate understanding of key concepts in ${detail.name}`,
      "Apply theoretical knowledge to practical problem-solving",
      "Communicate technical ideas effectively in written form",
      "Work collaboratively and independently on academic tasks",
    ],
    fetched_at: "2026-02-15T00:00:00Z",
    source: detail.weight_source === "unit_outline" ? "unit_outline" : "canvas_fallback",
  };

  return mockResponse(outline);
}
