import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { gpaReport } from "@/lib/fixtures/gpa";
import { currentUser } from "@/lib/fixtures/mock-state";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve GPA report", 500);
  }

  // Sync target_wam from current user state so settings changes propagate
  const report = { ...gpaReport, target_wam: currentUser.gpa_target };
  return mockResponse(report);
}
