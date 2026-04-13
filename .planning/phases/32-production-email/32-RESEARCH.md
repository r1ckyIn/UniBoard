# Phase 32: Production Email - Research

**Researched:** 2026-04-13
**Domain:** Email deliverability, Supabase Auth SMTP, Resend transactional email, branded HTML templates
**Confidence:** HIGH

## Summary

Phase 32 replaces Supabase's built-in email service with custom SMTP via Resend for production-grade email delivery. The current state is that `enable_confirmations = false` (auto-confirm on signup), password reset shows a "demo mode" toast, and there is no `auth/confirm` callback route. The phase must: (1) configure Resend SMTP in the Supabase dashboard, (2) enable email confirmations, (3) create an auth/confirm route handler for PKCE token exchange, (4) build branded HTML email templates for signup confirmation and password reset, (5) implement the forgot-password frontend flow, and (6) verify deliverability via SPF/DKIM.

**Primary recommendation:** Use the Supabase Dashboard SMTP Settings approach (not the Send Email Hook) -- it is the simplest path, requires no Edge Functions, and works with Go template-based email templates configured directly in the dashboard. Resend free tier (3,000 emails/month) is more than sufficient for a university startup.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-01 | Custom SMTP (Resend) replaces Supabase built-in email service | Supabase Dashboard SMTP Settings + Resend SMTP credentials (host: smtp.resend.com, port: 465, user: resend, pass: API key). Domain verification via Resend dashboard generates SPF/DKIM DNS records automatically. |
| EMAIL-02 | Branded email templates (signup confirmation, password reset) | Supabase Dashboard Email Templates page accepts Go template HTML with variables `{{ .SiteURL }}`, `{{ .TokenHash }}`, `{{ .Token }}`, `{{ .RedirectTo }}`. Templates can include inline CSS, logo images (hosted on Vercel public URL), and brand colors. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Code comments**: Pure English, no Chinese
- **Commit messages**: GSD format `<type>(<phase>-<plan>): <description>`
- **Testing**: vitest for frontend, pytest for backend
- **Frontend stack**: Next.js + TanStack Query v5 + Tailwind CSS + @supabase/ssr
- **Auth pattern**: Frontend supabase-js direct to Supabase Auth (login/signup/reset), Python validates JWT
- **Deployment**: Supabase (DB+Auth) + Railway (Python) + Vercel (Next.js)
- **Package managers**: pnpm 9+ (frontend), uv (backend)
- **Verification loop**: Build -> Test -> Lint -> TypeCheck

## Standard Stack

### Core (No New Dependencies)

This phase requires NO new npm packages. All functionality uses existing Supabase Auth features and dashboard configuration.

| Tool/Service | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Resend | SaaS (free tier) | SMTP relay for transactional emails | Official Supabase partner, native integration, 3,000 emails/month free |
| @supabase/supabase-js | ^2.100.0 (existing) | `resetPasswordForEmail()`, `verifyOtp()`, `updateUser()` | Already installed |
| @supabase/ssr | ^0.9.0 (existing) | Server-side Supabase client for auth/confirm route | Already installed |
| Supabase Dashboard | N/A | SMTP config + email template editor | Standard approach for hosted Supabase projects |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dashboard SMTP config | Send Email Hook + Edge Functions + React Email | Much more complex, requires deploying Supabase Edge Functions, overkill for 2 template types |
| Resend | AWS SES, SendGrid, Postmark | Resend has native Supabase integration, simpler setup, generous free tier |
| Go template HTML | React Email via Edge Function | Unnecessary complexity; Go templates work fine for 2 simple transactional emails |

## Architecture Patterns

### Auth Flow Changes (Before vs After)

**Current flow (auto-confirm):**
```
Register -> signUp() -> auto-confirm -> session created -> redirect to /setup
Forgot Password -> toast("demo mode") -> nothing happens
```

**Target flow (email confirmation):**
```
Register -> signUp() -> show "check your email" UI -> user clicks email link
  -> /auth/confirm?token_hash=X&type=email -> verifyOtp() -> session created -> redirect to /setup

Forgot Password -> resetPasswordForEmail() -> show "check your email" UI -> user clicks email link
  -> /auth/confirm?token_hash=X&type=recovery&next=/auth?mode=reset-password
  -> verifyOtp() -> session created -> redirect to update-password page
  -> updateUser({ password }) -> redirect to dashboard
```

### New Files to Create

```
frontend/
├── app/
│   └── auth/
│       └── confirm/
│           └── route.ts              # Token exchange route handler (PKCE)
├── components/
│   └── auth/
│       ├── ForgotPasswordForm.tsx     # Email input for password reset request
│       └── UpdatePasswordForm.tsx     # New password input after reset link clicked
supabase/
└── templates/                         # Local dev email templates (HTML)
    ├── confirmation.html              # Signup confirmation email
    └── recovery.html                  # Password reset email
```

### Auth Confirm Route Handler Pattern

The `/auth/confirm` route sits OUTSIDE the `[locale]` dynamic segment since Supabase emails link directly to it without locale prefix. This is a Route Handler (not a page), so it processes the token and redirects.

```typescript
// frontend/app/auth/confirm/route.ts
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/en'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Verification failed -- redirect to auth page with error
  return NextResponse.redirect(new URL('/en/auth?error=confirmation_failed', request.url))
}
```

### Password Reset Flow Pattern

```typescript
// In use-auth.ts -- new hook
export function useResetPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      if (error) throw error;
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (newPassword: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
    },
  });
}
```

### Email Template Architecture

Templates are configured in two places:
1. **Production (Supabase Dashboard):** Auth > Email Templates > edit HTML directly
2. **Local dev (config.toml):** `[auth.email.template.confirmation]` with `content_path`

Both use Go template syntax with the same variables.

### Anti-Patterns to Avoid

- **Do NOT use `{{ .ConfirmationURL }}` directly** -- it uses the implicit flow. Use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>` for PKCE flow compatibility.
- **Do NOT build a custom email sending service** -- Supabase Auth handles all email sending once SMTP is configured.
- **Do NOT put the auth/confirm route inside `[locale]`** -- email links are locale-agnostic; the route determines locale from context or defaults.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP client | Supabase Auth + Resend SMTP | Supabase handles all auth email triggers automatically |
| Email templates | Custom email rendering | Supabase Dashboard Email Templates | Go template syntax is sufficient, dashboard provides live preview |
| SPF/DKIM records | Manual DNS record crafting | Resend dashboard auto-generates | Resend generates exact records needed |
| Token verification | Custom token exchange | `supabase.auth.verifyOtp()` | Built-in PKCE token exchange handles all OTP types |
| Password reset flow | Custom reset tokens/DB storage | `resetPasswordForEmail()` + `updateUser()` | Supabase manages reset tokens, expiry, rate limiting |

## Common Pitfalls

### Pitfall 1: ConfirmationURL Uses Implicit Flow
**What goes wrong:** Using `{{ .ConfirmationURL }}` in email templates generates links with the implicit auth flow (tokens in URL fragment), which does not work with server-side rendering.
**Why it happens:** `{{ .ConfirmationURL }}` is the legacy default before PKCE was standard.
**How to avoid:** Always construct links manually: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
**Warning signs:** Auth callback returns 404 or tokens not exchanged.

### Pitfall 2: Email Prefetching Consumes Tokens
**What goes wrong:** Email security scanners (Microsoft Defender, Barracuda) auto-fetch URLs in emails, consuming the one-time token before the user clicks.
**Why it happens:** Enterprise email gateways prefetch links for malware scanning.
**How to avoid:** Use `{{ .TokenHash }}` in the confirm URL (NOT `{{ .Token }}`). Token hash can only be consumed via `verifyOtp()`, not a simple GET. If issues persist, consider adding a confirmation page with a "Confirm" button.
**Warning signs:** Users report "link expired" even when clicking immediately.

### Pitfall 3: Redirect URL Not in Allow-List
**What goes wrong:** Password reset `redirectTo` is silently ignored if not in Supabase's allowed redirect URLs.
**Why it happens:** Supabase only allows redirects to URLs configured in Auth > URL Configuration.
**How to avoid:** Add production URL and preview URLs to Supabase Auth redirect allow-list. Use wildcard patterns for Vercel preview deployments: `https://uni-board-*-r1ckyins-projects.vercel.app/**`
**Warning signs:** Reset flow redirects to site root instead of update-password page.

### Pitfall 4: RegisterForm Auto-Confirm Assumption
**What goes wrong:** Current `RegisterForm.tsx` calls `onRegisterSuccess()` immediately after signUp(), showing the SuccessOverlay that redirects to /setup. With confirmations enabled, the user won't have a session yet.
**Why it happens:** Code was written when `enable_confirmations = false` (auto-confirm).
**How to avoid:** After signUp with confirmations enabled, show a "Check your email" UI instead of the SuccessOverlay. The session is only created after email verification via `/auth/confirm`.
**Warning signs:** Users get redirected to /setup but aren't authenticated, causing auth guard loop.

### Pitfall 5: Rate Limit Too Low on Custom SMTP
**What goes wrong:** Default custom SMTP rate limit in Supabase is 30 emails/hour. During development/testing this can be exhausted quickly.
**Why it happens:** Supabase defaults to conservative rate limits when custom SMTP is first enabled.
**How to avoid:** Increase rate limit in Supabase Dashboard > Auth > Rate Limits after SMTP setup.
**Warning signs:** Users get "Email rate limit exceeded" errors.

### Pitfall 6: Local Dev Config vs Production Config
**What goes wrong:** Forgetting that local dev uses `config.toml` templates while production uses Dashboard templates. Changes in one don't propagate to the other.
**Why it happens:** Supabase has separate configuration paths for local vs hosted.
**How to avoid:** Maintain templates in `supabase/templates/` for local dev AND copy the same HTML into the Dashboard for production.
**Warning signs:** Emails look different locally vs production.

## Code Examples

### Resend SMTP Credentials (for Supabase Dashboard)

```
Host:        smtp.resend.com
Port:        465
Username:    resend
Password:    re_XXXXXXXXX  (Resend API key)
Sender:      UniBoard <noreply@yourdomain.com>
```

Source: [Resend SMTP docs](https://resend.com/docs/send-with-supabase-smtp)

### Branded Email Template (Signup Confirmation)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#faf9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 32px 0;">
              <h1 style="margin:0;font-size:24px;color:#1a1a1a;font-family:Georgia,serif;">UniBoard</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:24px 32px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">Confirm your email</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.5;">
                Thanks for signing up for UniBoard! Click the button below to confirm your email address and start maximizing your GPA.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
                       style="display:inline-block;padding:12px 32px;background-color:#d97757;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#999;line-height:1.5;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 32px;border-top:1px solid #f0ede8;">
              <p style="margin:0;font-size:12px;color:#bbb;text-align:center;">
                UniBoard -- Your GPA, Maximized.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

Source: Pattern based on [Supabase Email Templates docs](https://supabase.com/docs/guides/auth/auth-email-templates) + UniBoard design system (`#d97757` brand orange, `#faf9f5` cream background)

### Supabase config.toml Updates (Local Dev)

```toml
# Enable email confirmations
[auth.email]
enable_confirmations = true

# Custom SMTP for local dev (optional -- inbucket still works for testing)
# [auth.email.smtp]
# enabled = true
# host = "smtp.resend.com"
# port = 465
# user = "resend"
# pass = "env(RESEND_API_KEY)"
# admin_email = "noreply@yourdomain.com"
# sender_name = "UniBoard"

# Custom email templates
[auth.email.template.confirmation]
subject = "Confirm your UniBoard account"
content_path = "./templates/confirmation.html"

[auth.email.template.recovery]
subject = "Reset your UniBoard password"
content_path = "./templates/recovery.html"
```

Source: [Supabase customizing email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates)

### Supabase Dashboard Configuration Steps (Production)

1. **Resend:** Create account > Add domain > Copy DNS records > Verify > Create API key
2. **Supabase Dashboard:** Auth > SMTP Settings > Enable Custom SMTP > Enter Resend credentials
3. **Supabase Dashboard:** Auth > Email Templates > Edit "Confirm signup" and "Reset password" templates
4. **Supabase Dashboard:** Auth > URL Configuration > Add production URL + Vercel preview wildcard
5. **Supabase Dashboard:** Auth > General > Enable "Confirm email" toggle

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `{{ .ConfirmationURL }}` (implicit flow) | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (PKCE) | Supabase SSR v0.7+ | Server-side token exchange, more secure |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Already using the correct package |
| Separate auth callback for each flow | Single `/auth/confirm` route handles all OTP types | Current | EmailOtpType union handles email, recovery, email_change |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (frontend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `cd frontend && pnpm test -- --run` |
| Full suite command | `cd frontend && pnpm test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-01 | SMTP configured, emails sent via Resend | manual-only | N/A -- Supabase Dashboard config, DNS verification | N/A |
| EMAIL-02a | Auth confirm route handles token_hash + type correctly | unit | `cd frontend && pnpm test -- --run __tests__/auth/confirm-route.test.ts` | Wave 0 |
| EMAIL-02b | ForgotPasswordForm sends reset email request | unit | `cd frontend && pnpm test -- --run __tests__/auth/ForgotPasswordForm.test.tsx` | Wave 0 |
| EMAIL-02c | UpdatePasswordForm submits new password | unit | `cd frontend && pnpm test -- --run __tests__/auth/UpdatePasswordForm.test.tsx` | Wave 0 |
| EMAIL-02d | RegisterForm shows "check email" instead of auto-redirect | unit | `cd frontend && pnpm test -- --run __tests__/auth/RegisterForm.test.tsx` (update existing) | Existing (update) |
| EMAIL-02e | Email deliverability (SPF/DKIM pass, inbox not spam) | manual-only | Send test email, check headers with mail-tester.com | N/A |

### Sampling Rate
- **Per task commit:** `cd frontend && pnpm test -- --run && pnpm typecheck`
- **Per wave merge:** `cd frontend && pnpm test -- --run && pnpm lint && pnpm typecheck && pnpm build`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/__tests__/auth/confirm-route.test.ts` -- covers auth/confirm route handler logic
- [ ] `frontend/__tests__/auth/ForgotPasswordForm.test.tsx` -- covers forgot password form
- [ ] `frontend/__tests__/auth/UpdatePasswordForm.test.tsx` -- covers update password form

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Local dev email template testing | Yes | 2.75.0 | Dashboard-only config |
| pnpm | Frontend build/test | Yes | (existing) | -- |
| Resend account | SMTP relay | Manual setup | SaaS | -- |
| Custom domain DNS | SPF/DKIM records | Manual setup | -- | Use Resend subdomain (lower deliverability) |

**Missing dependencies with no fallback:**
- Resend account + API key (must be created manually in Resend dashboard)
- Domain DNS access (must add SPF/DKIM records via DNS provider)

**Missing dependencies with fallback:**
- None -- all code dependencies are already installed

## Open Questions

1. **Which domain to use for sending?**
   - What we know: Resend requires a verified domain. The project deploys to Vercel with URLs like `uni-board-{hash}-r1ckyins-projects.vercel.app`.
   - What's unclear: Whether the user owns a custom domain (e.g., `uniboard.app`) or needs to use a subdomain of an existing domain.
   - Recommendation: User must decide the sender domain. If no custom domain, can use Resend's onboarding domain temporarily but deliverability will be lower. Planner should include a manual step for domain setup.

2. **Production site_url in Supabase**
   - What we know: Local config has `site_url = "http://localhost:3001"`. Production needs the actual Vercel deployment URL.
   - What's unclear: Whether Supabase Dashboard already has site_url configured correctly for production.
   - Recommendation: Verify/update in Supabase Dashboard > Auth > URL Configuration. Include verification as a task.

3. **Logo asset for emails**
   - What we know: No UniBoard logo exists in `frontend/public/`. Email templates reference a logo.
   - What's unclear: Whether a logo image exists elsewhere or needs to be created.
   - Recommendation: Use text-based "UniBoard" heading in templates (as in the code example above). Can add image logo later if provided. Email images should be hosted on a stable URL (not Vercel preview URLs).

## Sources

### Primary (HIGH confidence)
- [Supabase Auth SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp) -- SMTP configuration steps
- [Supabase Email Templates docs](https://supabase.com/docs/guides/auth/auth-email-templates) -- Template variables and Go syntax
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords) -- Complete signup confirmation + password reset PKCE flow
- [Resend SMTP for Supabase](https://resend.com/docs/send-with-supabase-smtp) -- SMTP credentials (host/port/user/pass)
- [Resend Domain Management](https://resend.com/docs/dashboard/domains/introduction) -- DNS record setup
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) -- Allow-list configuration

### Secondary (MEDIUM confidence)
- [Supabase Customizing Email Templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) -- Local dev config.toml template config
- [Resend Pricing](https://resend.com/pricing) -- Free tier: 3,000 emails/month

### Tertiary (LOW confidence)
- [Supabase PKCE Issue #42527](https://github.com/supabase/supabase/issues/42527) -- Known issue with `auth.resend()` using implicit flow instead of PKCE (flagged for awareness)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Supabase + Resend is the official recommended integration, well-documented
- Architecture: HIGH -- PKCE flow for auth/confirm is the documented standard for Next.js SSR
- Pitfalls: HIGH -- Known issues well-documented in Supabase issues/discussions (prefetching, ConfirmationURL vs TokenHash, rate limits)
- Templates: MEDIUM -- Email HTML rendering varies across clients; inline CSS is standard practice but may need testing

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain, unlikely to change significantly)
