import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { courses } from "@/lib/fixtures/courses";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve courses", 500);
  }

  const { searchParams } = new URL(request.url);
  const semester = searchParams.get("semester");

  const filtered = semester
    ? courses.filter((c) => c.semester === semester)
    : courses;

  return mockResponse(filtered);
}
