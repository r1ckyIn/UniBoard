import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the proxy module before importing route handlers
vi.mock("@/lib/api/proxy", () => ({
  proxyRequest: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
}));

import { proxyRequest } from "@/lib/api/proxy";

/**
 * Spot-check tests verifying that converted Route Handlers
 * correctly delegate to proxyRequest with expected arguments.
 */

function createMockRequest(
  url: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3001"), {
    method: options.method ?? "GET",
    body: options.body ?? undefined,
    headers: options.headers ?? {},
  });
}

describe("proxy-routes spot-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/deadlines calls proxyRequest with no extra options", async () => {
    const { GET } = await import("@/app/api/v1/deadlines/route");
    const req = createMockRequest("http://localhost:3001/api/v1/deadlines?from=2026-04-01");
    await GET(req);

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req);
  });

  it("POST /api/v1/deadlines/[deadlineId]/actions sends backendPath with deadlineId and body", async () => {
    const { POST } = await import("@/app/api/v1/deadlines/[deadlineId]/actions/route");
    const req = createMockRequest("http://localhost:3001/api/v1/deadlines/dl_001/actions", {
      method: "POST",
      body: JSON.stringify({ action: "pin" }),
    });

    await POST(req, { params: Promise.resolve({ deadlineId: "dl_001" }) });

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req, {
      backendPath: "/api/v1/deadlines/dl_001/actions",
      body: expect.any(String),
    });
  });

  it("DELETE /api/v1/deadlines/[deadlineId]/actions/[action] sends backendPath with both params", async () => {
    const { DELETE } = await import(
      "@/app/api/v1/deadlines/[deadlineId]/actions/[action]/route"
    );
    const req = createMockRequest(
      "http://localhost:3001/api/v1/deadlines/dl_002/actions/pin",
      { method: "DELETE" },
    );

    await DELETE(req, {
      params: Promise.resolve({ deadlineId: "dl_002", action: "pin" }),
    });

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req, {
      backendPath: "/api/v1/deadlines/dl_002/actions/pin",
    });
  });

  it("PATCH /api/v1/users/me forwards request body", async () => {
    const { PATCH } = await import("@/app/api/v1/users/me/route");
    const req = createMockRequest("http://localhost:3001/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify({ display_name: "Test User" }),
    });

    await PATCH(req);

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req, {
      body: expect.any(String),
    });
  });

  it("PUT /api/v1/users/me/tokens/[platform] sends backendPath with platform and body", async () => {
    const { PUT } = await import("@/app/api/v1/users/me/tokens/[platform]/route");
    const req = createMockRequest("http://localhost:3001/api/v1/users/me/tokens/canvas", {
      method: "PUT",
      body: JSON.stringify({ token: "test_token_123" }),
    });

    await PUT(req, { params: Promise.resolve({ platform: "canvas" }) });

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req, {
      backendPath: "/api/v1/users/me/tokens/canvas",
      body: expect.any(String),
    });
  });

  it("GET /api/v1/sync/status calls proxyRequest with no extra options", async () => {
    const { GET } = await import("@/app/api/v1/sync/status/route");
    const req = createMockRequest("http://localhost:3001/api/v1/sync/status");
    await GET(req);

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req);
  });

  it("POST /api/v1/sync/trigger forwards request body", async () => {
    const { POST } = await import("@/app/api/v1/sync/trigger/route");
    const req = createMockRequest("http://localhost:3001/api/v1/sync/trigger", {
      method: "POST",
      body: JSON.stringify({ scope: "grades" }),
    });

    await POST(req);

    expect(proxyRequest).toHaveBeenCalledTimes(1);
    expect(proxyRequest).toHaveBeenCalledWith(req, {
      body: expect.any(String),
    });
  });
});
