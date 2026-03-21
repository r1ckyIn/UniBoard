import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { gpaPathDefault } from "@/lib/fixtures/gpa";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to compute GPA path", 500);
  }

  // Parse body to validate shape (mock ignores actual values)
  try {
    const body = (await request.json()) as { target_wam?: number };
    if (typeof body.target_wam !== "number") {
      return mockError(
        "VALIDATION_ERROR",
        "Missing required field: target_wam",
        400
      );
    }
  } catch {
    return mockError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  return mockResponse(gpaPathDefault);
}
