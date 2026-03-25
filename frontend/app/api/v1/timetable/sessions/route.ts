import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { timetableSessions } from "@/lib/fixtures/timetable";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve timetable", 500);
  }

  const week = request.nextUrl.searchParams.get("week");
  if (week) {
    const weekNum = parseInt(week, 10);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 14) {
      return mockError("VALIDATION_ERROR", "week must be 1-14", 400);
    }
    // Filter sessions whose weeks array includes this teaching week number
    const filtered = timetableSessions.filter((s) => s.weeks.includes(weekNum));
    return mockResponse(filtered);
  }

  return mockResponse(timetableSessions);
}
