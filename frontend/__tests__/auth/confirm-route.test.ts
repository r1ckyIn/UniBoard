import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the server-side Supabase client
const mockVerifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
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

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /en on successful email verification", async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const { GET } = await import("@/app/auth/confirm/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/confirm?token_hash=abc123&type=email",
    );
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "abc123",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en",
    );
  });

  it("redirects to next URL on successful recovery verification", async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const { GET } = await import("@/app/auth/confirm/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/confirm?token_hash=xyz789&type=recovery&next=/en/auth?mode=reset-password",
    );
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "xyz789",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/en/auth?mode=reset-password",
    );
  });

  it("redirects to error page when token_hash is missing", async () => {
    const { GET } = await import("@/app/auth/confirm/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/confirm?type=email",
    );
    const response = await GET(request);

    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en/auth?error=confirmation_failed",
    );
  });

  it("redirects to error page when verifyOtp returns error", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: null,
      error: { message: "Token expired" },
    });

    const { GET } = await import("@/app/auth/confirm/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/confirm?token_hash=expired123&type=email",
    );
    const response = await GET(request);

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "expired123",
    });
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en/auth?error=confirmation_failed",
    );
  });

  it("defaults next to /en when type=email and no next param", async () => {
    mockVerifyOtp.mockResolvedValue({ data: {}, error: null });

    const { GET } = await import("@/app/auth/confirm/route");
    const request = new NextRequest(
      "http://localhost:3001/auth/confirm?token_hash=valid456&type=email",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3001/en",
    );
  });
});
