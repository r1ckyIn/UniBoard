import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyRequest(request, { body });
}
