import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock global fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { proxyRequest } from "@/lib/api/proxy";

/**
 * Helper to create a NextRequest with optional method, headers, and body.
 */
function makeRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3001"), {
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
  });
}

describe("proxyRequest", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.NEXT_PUBLIC_API_URL = "http://backend:8000";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("forwards GET request to BACKEND_URL + same path + query params", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses?page=2&limit=10");
    await proxyRequest(req);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://backend:8000/api/v1/courses?page=2&limit=10");
    expect(calledOptions.method).toBe("GET");
  });

  it("forwards Authorization header from incoming request", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses", {
      headers: { Authorization: "Bearer my-jwt-token" },
    });
    await proxyRequest(req);

    const [, calledOptions] = mockFetch.mock.calls[0];
    expect(calledOptions.headers.Authorization).toBe("Bearer my-jwt-token");
  });

  it("forwards POST body to backend", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "abc" } }), { status: 201 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "canvas", token: "12345" }),
    });
    await proxyRequest(req, {
      method: "POST",
      body: JSON.stringify({ platform: "canvas", token: "12345" }),
    });

    const [, calledOptions] = mockFetch.mock.calls[0];
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.body).toBe(
      JSON.stringify({ platform: "canvas", token: "12345" }),
    );
  });

  it("uses backendPath option to override the URL path", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses/COMP1234");
    await proxyRequest(req, { backendPath: "/api/v1/courses/COMP1234/detail" });

    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://backend:8000/api/v1/courses/COMP1234/detail");
  });

  it("returns NextResponse.json(data) for 200 responses", async () => {
    const payload = { data: { gpa: 3.8 } };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/gpa");
    const resp = await proxyRequest(req);

    expect(resp.status).toBe(200);
    const json = await resp.json();
    expect(json).toEqual(payload);
  });

  it("returns friendly error message for 401", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "AUTH_EXPIRED", message: "Token expired" } }),
        { status: 401 },
      ),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses");
    const resp = await proxyRequest(req);

    expect(resp.status).toBe(401);
    const json = await resp.json();
    expect(json.error.message).toBe("Session expired. Please sign in again.");
    expect(json.error.code).toBe("AUTH_EXPIRED");
  });

  it("returns friendly error message for 404", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "NOT_FOUND", message: "Course not found" } }),
        { status: 404 },
      ),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses/INVALID");
    const resp = await proxyRequest(req);

    expect(resp.status).toBe(404);
    const json = await resp.json();
    expect(json.error.message).toBe("The requested resource was not found.");
  });

  it("returns friendly error message for 500", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "INTERNAL", message: "DB crash" } }),
        { status: 500 },
      ),
    );

    const req = makeRequest("http://localhost:3001/api/v1/gpa");
    const resp = await proxyRequest(req);

    expect(resp.status).toBe(500);
    const json = await resp.json();
    expect(json.error.message).toBe(
      "Something went wrong. Please try again later.",
    );
  });

  it("preserves backend error code in response", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: "TOKEN_INVALID", message: "bad token" } }),
        { status: 401 },
      ),
    );

    const req = makeRequest("http://localhost:3001/api/v1/tokens");
    const resp = await proxyRequest(req);

    const json = await resp.json();
    expect(json.error.code).toBe("TOKEN_INVALID");
  });

  it("handles 204 No Content without parsing JSON", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const req = makeRequest("http://localhost:3001/api/v1/tokens/canvas", {
      method: "DELETE",
    });
    const resp = await proxyRequest(req, { method: "DELETE" });

    expect(resp.status).toBe(204);
    expect(resp.body).toBeNull();
  });

  it("returns raw Response with text/event-stream for SSE streams", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: {\"chunk\":\"hello\"}\n\n"));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/ai/chat");
    const resp = await proxyRequest(req, { stream: true });

    expect(resp.headers.get("Content-Type")).toBe("text/event-stream");
    expect(resp.headers.get("Cache-Control")).toBe("no-cache");
    expect(resp.headers.get("Connection")).toBe("keep-alive");
  });

  it("handles backend returning non-JSON error body gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 502 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses");
    const resp = await proxyRequest(req);

    expect(resp.status).toBe(502);
    const json = await resp.json();
    expect(json.error.message).toBe(
      "External service temporarily unavailable.",
    );
    expect(json.error.code).toBe("PROXY_ERROR");
  });

  it("includes Content-Type: application/json only when body is provided", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    // GET request with no body
    const req = makeRequest("http://localhost:3001/api/v1/courses");
    await proxyRequest(req);

    const [, calledOptions] = mockFetch.mock.calls[0];
    expect(calledOptions.headers["Content-Type"]).toBeUndefined();

    // POST with body
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    const reqPost = makeRequest("http://localhost:3001/api/v1/tokens", {
      method: "POST",
    });
    await proxyRequest(reqPost, {
      method: "POST",
      body: JSON.stringify({ token: "abc" }),
    });

    const [, calledOptions2] = mockFetch.mock.calls[1];
    expect(calledOptions2.headers["Content-Type"]).toBe("application/json");
  });

  it("falls back to http://localhost:8000 when NEXT_PUBLIC_API_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );

    const req = makeRequest("http://localhost:3001/api/v1/courses");
    await proxyRequest(req);

    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain("http://localhost:8000");
  });
});
