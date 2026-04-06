import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.text();
  return proxyRequest(request, {
    backendPath: `/api/v1/courses/${id}/qa/stream`,
    body,
    stream: true,
  });
}
