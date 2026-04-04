import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { deadlines } from "@/lib/fixtures/deadlines";
import { courses } from "@/lib/fixtures/courses";

// Module-scoped state for mock pin/delete persistence
// (survives page navigation, resets on server restart)
export const deadlineActions = new Map<string, Set<string>>();
deadlineActions.set("pinned", new Set<string>());
deadlineActions.set("deleted", new Set<string>());

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve deadlines", 500);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const courseId = searchParams.get("course_id");

  let filtered = [...deadlines];

  // Filter by course_id (look up course code from id)
  if (courseId) {
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      filtered = filtered.filter((d) => d.course_code === course.code);
    } else {
      // Unknown course_id returns empty results
      filtered = [];
    }
  }

  // Filter by date range
  if (from) {
    const fromDate = new Date(from);
    filtered = filtered.filter((d) => new Date(d.due_date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    filtered = filtered.filter((d) => new Date(d.due_date) <= toDate);
  }

  // Annotate each deadline with user action state
  const pinnedIds = deadlineActions.get("pinned")!;
  const deletedIds = deadlineActions.get("deleted")!;
  const enriched = filtered.map((d) => ({
    ...d,
    is_pinned: pinnedIds.has(d.id),
    is_deleted: deletedIds.has(d.id),
  }));

  return mockResponse(enriched);
}
