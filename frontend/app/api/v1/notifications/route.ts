import { NextRequest } from "next/server";
import {
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
  mockPaginatedResponse,
} from "@/lib/fixtures/helpers";
import { notifications } from "@/lib/fixtures/notifications";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve notifications", 500);
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread_only") === "true";
  const cursor = searchParams.get("cursor");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  // Filter by unread status if requested
  const filtered = unreadOnly
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  return mockPaginatedResponse(filtered, cursor, limit);
}
