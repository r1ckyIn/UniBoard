import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { deadlines } from "@/lib/fixtures/deadlines";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError(
      "INTERNAL_ERROR",
      "Failed to retrieve upcoming deadlines",
      500
    );
  }

  // Return deadlines with days_remaining between 0 and 7 (inclusive)
  const upcoming = deadlines.filter(
    (d) => d.days_remaining >= 0 && d.days_remaining <= 7
  );

  return mockResponse(upcoming);
}
