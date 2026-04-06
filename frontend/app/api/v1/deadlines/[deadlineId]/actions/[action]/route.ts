import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deadlineId: string; action: string }> },
) {
  const { deadlineId, action } = await params;
  return proxyRequest(request, {
    backendPath: `/api/v1/deadlines/${deadlineId}/actions/${action}`,
  });
}
