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

  // Inspect profile token state to decide /setup vs /en.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/en/auth?error=oauth_failed", origin),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("canvas_token_status, ed_token_status")
    .eq("id", user.id)
    .single();

  const tokensMissing =
    !profile ||
    ((profile.canvas_token_status === "missing" ||
      !profile.canvas_token_status) &&
      (profile.ed_token_status === "missing" || !profile.ed_token_status));

  return NextResponse.redirect(
    new URL(tokensMissing ? "/setup" : "/en", origin),
  );
}
