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

  const body = (await request.json()) as { refresh_token?: string };

  if (!body.refresh_token) {
    return mockError("AUTH_REQUIRED", "Missing refresh token", 401);
  }

  return mockResponse({
    access_token: `mock-jwt-access-${crypto.randomUUID().slice(0, 8)}`,
    refresh_token: `mock-jwt-refresh-${crypto.randomUUID().slice(0, 8)}`,
    expires_in: 900,
  });
}
