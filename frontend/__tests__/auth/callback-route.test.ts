import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the server-side Supabase client
const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockProfileSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          single: () => mockProfileSingle(),
        }),
      }),
    }),
  }),
}));

// Mock next/headers cookies (required by createClient internals)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /setup when code is valid and both tokens are missing", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({
      data: { canvas_token_status: "missing", ed_token_status: "missing" },
      error: null,
    });

    const { GET } = await import("@/app/auth/callback/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/callback?code=abc123",
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/setup",
    );
  });

  it("redirects to /en when at least one token is configured", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-456" } },
      error: null,
    });
    mockProfileSingle.mockResolvedValue({
      data: { canvas_token_status: "active", ed_token_status: "missing" },
      error: null,
    });

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
    // getUser / profile lookup must not fire when explicit next is given
    expect(mockGetUser).not.toHaveBeenCalled();
  });
});
