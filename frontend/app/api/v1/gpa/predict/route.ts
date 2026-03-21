import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { gpaPredictionDefault } from "@/lib/fixtures/gpa";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to compute GPA prediction", 500);
  }

  // Parse body to validate shape (mock ignores actual values)
  try {
    const body = (await request.json()) as {
      what_if_scores?: unknown[];
      scale?: string;
    };
    if (!body.what_if_scores || !body.scale) {
      return mockError(
        "VALIDATION_ERROR",
        "Missing required fields: what_if_scores, scale",
        400
      );
    }
  } catch {
    return mockError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  return mockResponse(gpaPredictionDefault);
}
