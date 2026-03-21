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

  const body = (await request.json()) as {
    email?: string;
    code?: string;
    new_password?: string;
  };

  if (!body.email || !body.code || !body.new_password) {
    return mockError(
      "VALIDATION_ERROR",
      "Missing required fields: email, code, new_password",
      400,
    );
  }

  return mockResponse({ message: "Password reset successful" });
}
