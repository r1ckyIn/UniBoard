import { NextResponse } from "next/server";
import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { mockUser } from "@/lib/fixtures/users";

export async function GET(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  return mockResponse(mockUser);
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
  };

  // Merge updates with mock user
  const updatedUser = { ...mockUser, ...body };

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
