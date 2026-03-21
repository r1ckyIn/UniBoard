import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { searchResults } from "@/lib/fixtures/search";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Search service unavailable", 500);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  // Validate required query parameter
  if (!q) {
    return mockError(
      "VALIDATION_ERROR",
      "Query parameter 'q' is required",
      400,
    );
  }

  const scope = searchParams.get("scope");
  const courseId = searchParams.get("course_id");
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  let filtered = searchResults;

  // Filter by query string (case-insensitive match on title and snippet)
  const queryLower = q.toLowerCase();
  filtered = filtered.filter(
    (r) =>
      r.title.toLowerCase().includes(queryLower) ||
      r.snippet.toLowerCase().includes(queryLower),
  );

  // Filter by scope (type)
  if (scope && scope !== "all") {
    const typeMap: Record<string, string> = {
      materials: "material",
      discussions: "discussion",
    };
    const targetType = typeMap[scope] ?? scope;
    filtered = filtered.filter((r) => r.type === targetType);
  }

  // Filter by course_id (match on course_code)
  if (courseId) {
    filtered = filtered.filter((r) => r.course_code === courseId);
  }

  // Apply limit
  filtered = filtered.slice(0, limit);

  return mockResponse(filtered);
}
