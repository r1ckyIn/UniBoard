import {
  mockDelay,
  mockResponse,
  mockError,
  shouldSimulateError,
} from "@/lib/fixtures/helpers";
import { mockUser } from "@/lib/fixtures/users";

export async function POST(request: Request) {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return mockError(
      "VALIDATION_ERROR",
      "Missing required fields: email, password",
      400,
    );
  }

  // Accept any email/password combo for mock
  return mockResponse({
    access_token: `mock-jwt-access-${crypto.randomUUID().slice(0, 8)}`,
    refresh_token: `mock-jwt-refresh-${crypto.randomUUID().slice(0, 8)}`,
    expires_in: 900,
    user: mockUser,
  });
}
