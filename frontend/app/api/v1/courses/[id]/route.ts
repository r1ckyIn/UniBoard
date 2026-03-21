import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { courseDetails } from "@/lib/fixtures/courses";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve course", 500);
  }

  const { id } = await params;
  const detail = courseDetails[id];

  if (!detail) {
    return mockError("NOT_FOUND", "Course not found", 404);
  }

  return mockResponse(detail);
}
