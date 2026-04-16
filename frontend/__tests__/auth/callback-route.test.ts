import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the server-side Supabase client
const mockExchangeCodeForSession = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  }),
}));

// Mock next/headers cookies (required by createClient internals)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// Stub global fetch for the Python API call.
const originalFetch = global.fetch;
const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

function mockUserApi(canvas: string, ed: string) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: {
        tokens: {
          canvas: { status: canvas },
          ed: { status: ed },
        },
      },
    }),
  });
}

describe("GET /auth/callback", () => {
  it("redirects to /setup when code is valid and both tokens are missing", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-abc" } },
      error: null,
    });
    mockUserApi("not_configured", "not_configured");

    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/callback?code=abc123",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/users/me"),
      { headers: { Authorization: "Bearer jwt-abc" } },
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/setup",
    );
  });

  it("redirects to /en when at least one token is configured", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-xyz" } },
      error: null,
    });
    mockUserApi("active", "not_configured");

    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/callback?code=xyz789",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("xyz789");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en",
    );
  });

  it("redirects to /en/auth?error=oauth_failed when code is missing", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest("http://localhost:3001/auth/callback");
    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en/auth?error=oauth_failed",
    );
  });

  it("redirects to /en/auth?error=oauth_failed when exchangeCodeForSession returns an error", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "Invalid code" },
    });

    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/callback?code=bad-code",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("bad-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en/auth?error=oauth_failed",
    );
  });

  it("honors the next searchParam when present, overriding the default redirect target", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: null });

    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/callback?code=good-code&next=/en/dashboard",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("good-code");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en/dashboard",
    );
    // session lookup / API call must not fire when explicit next is given
    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
