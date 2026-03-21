import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to trigger sync", 500);
  }

  // Parse request body for scope
  let scope = "all";
  try {
    const body = (await request.json()) as { scope?: string };
    scope = body.scope ?? "all";
  } catch {
    // Default to "all" if body parsing fails
  }

  return mockResponse(
    {
      sync_id: "sync_" + crypto.randomUUID().slice(0, 6),
      status: "in_progress" as const,
      started_at: new Date().toISOString(),
      scope,
    },
    202,
  );
}
