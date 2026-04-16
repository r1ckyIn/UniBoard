import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback route handler (Google OAuth via Supabase).
 *
 * Supabase redirects OAuth flows to /auth/callback?code=... with a PKCE code.
 * This route sits outside [locale] because OAuth redirect URIs are locale-agnostic
 * (same convention as /auth/confirm). It exchanges the code for a session and then
 * decides the destination based on the user's token configuration state:
 *   - Both Canvas + Ed tokens missing -> /setup (onboarding)
 *   - At least one token configured -> /en (dashboard)
 *   - Explicit `next` searchParam -> honored as-is
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(
      new URL("/en/auth?error=oauth_failed", origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/en/auth?error=oauth_failed", origin),
    );
  }

  // Explicit next param short-circuits the token-state lookup.
  if (next) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Inspect token state via the Python API (single data-query entry point per
  // CLAUDE.md "数据查询单一入口" rule — supabase-js is reserved for Auth).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL("/en/auth?error=oauth_failed", origin),
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  let tokensMissing = true;
  try {
    const resp = await fetch(`${apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (resp.ok) {
      const body = (await resp.json()) as {
        data?: {
          tokens?: {
            canvas?: { status?: string };
            ed?: { status?: string };
          };
        };
      };
      const canvasActive = body.data?.tokens?.canvas?.status === "active";
      const edActive = body.data?.tokens?.ed?.status === "active";
      tokensMissing = !canvasActive && !edActive;
    }
  } catch {
    // Backend unreachable — default to /setup so the user can still onboard.
  }

  return NextResponse.redirect(
    new URL(tokensMissing ? "/setup" : "/en", origin),
  );
}
