import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string }> },
) {
  const { deadlineId } = await params;
  const body = await request.text();
  return proxyRequest(request, {
    backendPath: `/api/v1/deadlines/${deadlineId}/actions`,
    body,
  });
}
