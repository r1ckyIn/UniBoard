import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";

export async function POST(
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

  return mockResponse({ status: "active" as const, valid: true });
}
