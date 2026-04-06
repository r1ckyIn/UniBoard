import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { threadId } = await params;
  const body = await request.text();
  return proxyRequest(request, {
    backendPath: `/api/v1/threads/${threadId}/feedback`,
    body,
  });
}
