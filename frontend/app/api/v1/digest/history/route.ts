import { NextRequest } from "next/server";
import {
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
  mockPaginatedResponse,
} from "@/lib/fixtures/helpers";
import { digestHistory } from "@/lib/fixtures/digest";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve digest history", 500);
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  return mockPaginatedResponse(digestHistory, cursor, limit);
}
