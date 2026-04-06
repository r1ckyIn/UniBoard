import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const body = await request.text();
  return proxyRequest(request, {
    backendPath: `/api/v1/users/me/tokens/${platform}`,
    body,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  return proxyRequest(request, {
    backendPath: `/api/v1/users/me/tokens/${platform}`,
  });
}
