import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
} from "@/lib/fixtures/helpers";

export async function POST(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const body = (await request.json()) as { email?: string };

  if (!body.email) {
    return mockError("VALIDATION_ERROR", "Missing required field: email", 400);
  }

  return mockResponse({ message: "Password reset code sent" });
}
