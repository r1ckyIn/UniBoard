import { NextRequest } from "next/server";
import {
  mockResponse,
  mockError,
  mockDelay,
  shouldSimulateError,
  requireAuth,
} from "@/lib/fixtures/helpers";
import { materialsByCourse } from "@/lib/fixtures/materials";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAuth(request);
  if (authError) return authError;

  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Failed to retrieve materials", 500);
  }

  const { id } = await params;
  const materials = materialsByCourse[id] ?? [];

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  const filtered = source
    ? materials.filter((m) => m.source === source)
    : materials;

  return mockResponse(filtered);
}
