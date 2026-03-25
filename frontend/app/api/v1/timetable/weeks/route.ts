import { NextRequest } from "next/server";
import {
  mockResponse,
  mockDelay,
  shouldSimulateError,
  mockError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { semesterWeeks } from "@/lib/fixtures/timetable";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError(
      "INTERNAL_ERROR",
      "Failed to retrieve semester weeks",
      500,
    );
  }

  return mockResponse(semesterWeeks);
}
