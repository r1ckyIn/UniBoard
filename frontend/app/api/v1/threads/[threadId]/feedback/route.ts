import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy POST /api/v1/threads/{threadId}/feedback to Python backend.
 * Forwards Authorization header for Supabase JWT validation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const body = await request.json();

  const backendUrl = `${
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  }/api/v1/threads/${threadId}/feedback`;

  const resp = await fetch(backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("Authorization") || "",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  return NextResponse.json(data, { status: resp.status });
}
