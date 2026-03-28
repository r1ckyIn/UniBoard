import { NextResponse } from "next/server";
import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { currentUser, updateCurrentUser } from "@/lib/fixtures/mock-state";

export async function GET(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  return mockResponse(currentUser);
}

export async function PATCH(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  const body = (await request.json()) as {
    display_name?: string;
    gpa_target?: number;
    gpa_scale?: "wam" | "gpa_4" | "gpa_7";
    language_preference?: string;
  };

  const updatedUser = updateCurrentUser(body);

  return mockResponse(updatedUser);
}

export async function DELETE(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  return new NextResponse(null, { status: 204 });
}
