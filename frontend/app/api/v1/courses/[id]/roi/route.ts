import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyRequest(request, {
    backendPath: `/api/v1/courses/${id}/roi`,
  });
}
