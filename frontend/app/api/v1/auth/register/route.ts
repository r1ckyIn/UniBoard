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
    password?: string;
    display_name?: string;
  };

  // Validate required fields
  if (!body.email || !body.password || !body.display_name) {
    return mockError(
      "VALIDATION_ERROR",
      "Missing required fields: email, password, display_name",
      400,
    );
  }

  // Validate email format
  if (!body.email.includes("@")) {
    return mockError("VALIDATION_ERROR", "Invalid email format", 400);
  }

  return mockResponse(
    { user_id: "usr_001", pending_verification: true },
    201,
  );
}
