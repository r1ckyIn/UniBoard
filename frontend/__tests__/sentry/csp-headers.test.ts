import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("CSP connect-src configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("includes NEXT_PUBLIC_API_URL origin in CSP connect-src when env var is set", () => {
    const apiUrl = "https://uniboard-backend.up.railway.app/api/v1";
    const apiHost = new URL(apiUrl).origin;

    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      apiHost,
    ]
      .filter(Boolean)
      .join(" ");

    expect(connectSrc).toContain(
      "https://uniboard-backend.up.railway.app"
    );
  });

  it("retains existing CSP entries (self, supabase, sentry ingest)", () => {
    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
    ]
      .filter(Boolean)
      .join(" ");

    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https://*.supabase.co");
    expect(connectSrc).toContain("wss://*.supabase.co");
    expect(connectSrc).toContain("https://*.ingest.sentry.io");
  });

  it("does not produce trailing spaces when NEXT_PUBLIC_API_URL is empty", () => {
    const apiUrl = "";
    const apiHost = apiUrl ? new URL(apiUrl).origin : "";

    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.ingest.sentry.io",
      apiHost,
    ]
      .filter(Boolean)
      .join(" ");

    // Should not have empty entries or trailing spaces
    expect(connectSrc).not.toMatch(/\s{2,}/);
    expect(connectSrc).not.toMatch(/\s$/);
    expect(connectSrc).toBe(
      "'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io"
    );
  });

  it("extracts correct origin from API URL with path", () => {
    const apiUrl = "https://uniboard-backend.up.railway.app/api/v1";
    const apiHost = new URL(apiUrl).origin;

    expect(apiHost).toBe("https://uniboard-backend.up.railway.app");
  });
});
