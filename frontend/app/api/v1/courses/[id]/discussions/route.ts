import { NextRequest } from "next/server";
import {
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
  mockPaginatedResponse,
} from "@/lib/fixtures/helpers";
import { discussionsByCourse } from "@/lib/fixtures/discussions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve discussions", 500);
  }

  const { id } = await params;
  const discussions = discussionsByCourse[id] ?? [];

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") ?? "all";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "20", 10) || 20,
    100
  );

  let filtered = discussions;

  switch (filter) {
    case "high_value":
      filtered = discussions.filter((d) => d.gpa_relevance_score >= 0.7);
      break;
    case "endorsed":
      filtered = discussions.filter((d) => d.is_endorsed);
      break;
    case "staff":
      filtered = discussions.filter((d) => d.is_staff_post);
      break;
    case "all":
    default:
      break;
  }

  return mockPaginatedResponse(filtered, cursor, limit);
}
