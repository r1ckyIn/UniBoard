// Supabase login helper for Phase 38 P04 pixel-diff suite.
//
// Signs the `perf-test@uniboard.uk` fixture user in via the Supabase Auth
// password-grant REST endpoint, then injects the resulting session into the
// Playwright browser context so downstream navigations see a logged-in
// user (matches @supabase/ssr's chunked cookie shape).
//
// Environment gate — all three env vars must be present:
//   PERF_TEST_PASSWORD              — GitHub Secret (CI) or frontend/.env.local (dev)
//   NEXT_PUBLIC_SUPABASE_URL        — already required by the app itself
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or
//   NEXT_PUBLIC_SUPABASE_ANON_KEY    (legacy alias)
//
// The helper fails fast when PERF_TEST_PASSWORD is unset so a blank-password
// login attempt can never reach Supabase (T-38-11 in the threat register).
// Tests that call this helper should be wrapped in a test.skip() when the
// password is missing, not fail — see `shouldRunPerfSuite()` in
// first-paint.spec.ts.

import type { Page } from "@playwright/test";

export const PERF_TEST_EMAIL_DEFAULT = "perf-test@uniboard.uk" as const;

/**
 * Returns true when the perf suite has the credentials it needs to run.
 * Use inside test.skip() so the suite skips cleanly in CI without the
 * secret, instead of failing with a cryptic env error.
 */
export function shouldRunPerfSuite(): boolean {
  return Boolean(
    process.env.PERF_TEST_PASSWORD &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

interface SupabaseLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user?: { id: string; email?: string };
}

/**
 * Log the fixture user in and persist the session cookies into the
 * Playwright browser context.
 *
 * Cookie strategy: @supabase/ssr uses a project-scoped cookie name
 * (`sb-<project-ref>-auth-token`). We derive the project ref from
 * NEXT_PUBLIC_SUPABASE_URL and write a single JSON value matching the
 * SSR cookie shape so the Next.js middleware sees an authenticated session
 * on the very first request (no redirect to /auth).
 *
 * If direct cookie injection does not persist (detected by the middleware
 * redirecting to /auth), the spec should fall back to a UI login flow
 * (visit /auth, fill form, submit) — that fallback is NOT implemented
 * here to keep the helper deterministic; add it if the CI run proves it
 * necessary.
 */
export async function loginAsPerfTestUser(page: Page): Promise<void> {
  const password = process.env.PERF_TEST_PASSWORD;
  if (!password) {
    throw new Error(
      "PERF_TEST_PASSWORD not set — add to GitHub Secrets (CI) or frontend/.env.local (dev).",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL / anon key not set — NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.",
    );
  }

  const email = process.env.PERF_TEST_EMAIL ?? PERF_TEST_EMAIL_DEFAULT;

  const resp = await page.request.post(
    `${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      data: { email, password },
    },
  );
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(
      `Supabase login failed status=${resp.status()} body=${body.slice(0, 200)}`,
    );
  }
  const session = (await resp.json()) as SupabaseLoginResponse;

  // Derive project ref from https://<ref>.supabase.co or custom domain.
  // Falls back to "default" which still lets `sb-default-auth-token` work
  // in local Supabase setups.
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\./);
  const projectRef = refMatch?.[1] ?? "default";
  const cookieName = `sb-${projectRef}-auth-token`;

  // @supabase/ssr serialises the session as a JSON value; newer versions
  // use base64-`eyJ...` chunked cookies, older versions use a plain JSON
  // string. We write the JSON form — @supabase/ssr parses both.
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  const cookieUrl =
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      url: cookieUrl,
      httpOnly: false,
      secure: cookieUrl.startsWith("https://"),
      sameSite: "Lax",
    },
  ]);
}
