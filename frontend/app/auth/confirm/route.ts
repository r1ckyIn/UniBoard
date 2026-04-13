import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Auth confirm route handler for PKCE token exchange.
 *
 * Supabase emails link to /auth/confirm with token_hash and type params.
 * This route sits outside [locale] since email links are locale-agnostic.
 * It exchanges the token via verifyOtp and redirects the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/en";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Verification failed -- redirect to auth page with error
  return NextResponse.redirect(
    new URL("/en/auth?error=confirmation_failed", request.url),
  );
}
