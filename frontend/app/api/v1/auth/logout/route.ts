import { NextResponse } from "next/server";
import { mockDelay, shouldSimulateError, mockError } from "@/lib/fixtures/helpers";

export async function POST() {
  await mockDelay();

  if (shouldSimulateError()) {
    return mockError("INTERNAL_ERROR", "Mock server error", 500);
  }

  return new NextResponse(null, { status: 204 });
}
