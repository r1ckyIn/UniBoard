import { NextResponse } from "next/server";

/**
 * Wrap data in the standard success envelope:
 * { data: T, meta: { request_id, timestamp } }
 */
export function mockResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      data,
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}

/**
 * Return a standard error envelope:
 * { error: { code, message } }
 */
export function mockError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Simulate network latency with a random delay between min and max ms.
 */
export function mockDelay(min = 100, max = 800): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Return true at the given probability rate to simulate random server errors.
 */
export function shouldSimulateError(rate = 0.05): boolean {
  return Math.random() < rate;
}

/**
 * Validate that the request carries a Bearer token.
 * Returns a 401 error response if missing, or null if auth is OK.
 */
export function requireAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return mockError("AUTH_REQUIRED", "Authentication required", 401);
  }
  return null;
}

/**
 * Build a paginated response using cursor-based pagination.
 * Uses index-based cursors (base64-encoded index) for generic compatibility.
 * Works with any array type regardless of ID field name.
 */
export function mockPaginatedResponse<T>(
  data: T[],
  cursor: string | null,
  limit: number,
) {
  let startIndex = 0;
  if (cursor) {
    try {
      const decoded = parseInt(
        Buffer.from(cursor, "base64").toString("utf-8"),
        10,
      );
      if (!isNaN(decoded)) startIndex = decoded;
    } catch {
      startIndex = 0;
    }
  }

  const sliced = data.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < data.length;
  const nextCursor = hasMore
    ? Buffer.from(String(startIndex + limit)).toString("base64")
    : null;

  return NextResponse.json({
    data: sliced,
    meta: {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
    pagination: {
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  });
}
