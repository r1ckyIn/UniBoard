import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  const body = await request.text();
  return proxyRequest(request, { body });
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}
