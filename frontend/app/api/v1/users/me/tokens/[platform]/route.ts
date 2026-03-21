import { NextResponse } from "next/server";
import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  const { platform } = await params;

  // Validate platform value
  if (platform !== "canvas" && platform !== "ed") {
    return mockError(
      "VALIDATION_ERROR",
      `Invalid platform: ${platform}. Must be "canvas" or "ed".`,
      400,
    );
  }

  const body = (await request.json()) as { token?: string };

  if (!body.token) {
    return mockError("VALIDATION_ERROR", "Missing required field: token", 400);
  }

  return mockResponse({ status: "active" as const, courses_found: 5 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const authError = requireAuth(request);
  if (authError) return authError;

  const { platform } = await params;

  if (platform !== "canvas" && platform !== "ed") {
    return mockError(
      "VALIDATION_ERROR",
      `Invalid platform: ${platform}. Must be "canvas" or "ed".`,
      400,
    );
  }

  return new NextResponse(null, { status: 204 });
}
