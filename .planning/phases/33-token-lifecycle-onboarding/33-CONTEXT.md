# Phase 33: Token Lifecycle & Onboarding (with Auth Hardening) — Context

**Gathered:** 2026-04-15
**Status:** Ready for planning
**Source:** Synthesized from `.continue-here.md` (paused discuss-phase) + single-user architectural defaults. No interactive discuss was run. Gray areas A–F were resolved by technical judgement because this project has exactly one active user (the developer) and all gray areas were architecture-level, not business-level.

<domain>
## Phase Boundary

This phase delivers three coordinated outcomes:

1. **Token lifecycle (EMAIL-03)** — the scheduled `check_token_health()` job extends from "in-app notification only" (existing Phase 17 behavior) to also send a **backup recall email** after 14 days of user absence. Email is a fallback channel; in-app + Settings/Dashboard banner are the primary signals.

2. **Onboarding polish (ONBD-01 / ONBD-02)** — the 5-step setup flow (Welcome → Token → Tutorial → Sync → Success) gets UX polish: per-domain sync progress, edge-case copy, TokenStep skip re-validation, retry UX on API/sync failure.

3. **Auth hardening (AUTH-HARDEN-01 … 04)** — Google OAuth as the primary auth path for USYD users (bypasses the Mimecast email-quarantine problem surfaced in Phase 32). Registration page gets a USYD-specific notice, RegisterForm gets a Resend-email button with 60s cooldown, and Supabase email confirmation is permanently documented as OFF.

**Out of scope (explicit deferrals):**
- Canvas/Ed token auto-refresh — neither platform issues refresh tokens, so no refresh flow is possible.
- Email preferences UI (user-controlled opt-out of recall emails) — deferred to Phase 36 (UX Polish) per `project_ux_improvements_backlog`.
- Push notifications for token expiry — owned by Phase 35 (push notifications).
- Account-merge migration tooling for USYD users who have pre-existing password accounts with the same email as their Google identity — not needed because Supabase's default identity-linking behavior handles this automatically when the email is verified on both sides (see decisions below).

</domain>

<decisions>
## Implementation Decisions

### Locked carry-over from `.continue-here.md`

- **Email is the fallback channel, not primary.** In-app notifications + Settings banner fire immediately on `token_status='expired'`. Email only fires after 14 days of user absence. Rationale: Mimecast can quarantine `uniboard.uk` sender; we cannot rely on reach.
- **Google OAuth is the recommended primary auth path for USYD users.** Bypasses email entirely.
- **Email confirmation is permanently OFF in Supabase** (production + local). AUTH-HARDEN-04 is documentation only — no code change to `supabase/config.toml` required beyond comments.
- **Recall email content must be engagement-positive**, not bare "your token expired." Must surface value the user is missing (e.g., "You have N deadlines waiting").

### EMAIL-03 — Recall email (area A resolved)

- **Absence definition:** user is "absent" if `auth.users.last_sign_in_at < now() - interval '14 days'` AND `profiles.last_sync_at < now() - interval '14 days'`. Both signals — a user who recently logged in but hasn't synced is not absent; a user who synced but never logs in isn't either (actively disengaged).
- **Trigger point:** the existing `check_token_health()` scheduled job (every 30 min). No new scheduler — extend the existing one.
- **Sent-once guard:** add `recall_email_sent_at` column on `profiles` to prevent re-sending. Nullable timestamp. Re-arms when `token_status` transitions `expired -> ok -> expired` (i.e., user reconnected then expired again).
- **Content template (HTML + text fallback):**
  - Subject: `Your UniBoard sync has paused — N deadlines waiting`
  - Body highlights: (a) how many upcoming deadlines exist in next 14 days; (b) one-click deep link to `/setup?step=token`; (c) single P.S. line recommending Google OAuth to avoid future email issues.
  - Deadline count comes from `DeadlineService.get_deadlines(user_id, start_date=now, end_date=now + 14d)` (existing method — no new public API needed). If zero deadlines, subject degrades to `Your UniBoard sync has paused — reconnect when you're back`.
- **Transport (CORRECTED after research):** use the **existing AWS SES sender at `src/email/ses.py`** which is already wired and battle-tested for notifications. Do NOT add Resend SDK — single transport is simpler. Recall-email module lives at `src/services/recall_email.py` and composes the SES sender.
- **Rate limit:** max 1 recall email per user per 30 days, enforced by the `recall_email_sent_at` column logic above. Hard cap at Resend side is high enough we don't need additional app-level throttling.

### ONBD-01 — Onboarding polish (area B resolved)

- **Keep 5 steps.** Do not reshape the flow.
- **WelcomeStep gets a "Sign in with Google" shortcut** only when the user is NOT yet authenticated. Since setup runs post-login, in practice WelcomeStep just surfaces a brief note: "You're signed in as {email}. First-time users can also sign in with Google." — no dual-button CTA.
- **Per-domain sync progress on SuccessStep (CORRECTED after research):**
  - `GET /sync/status` + TanStack polling are already built. This is **display-only work**, no new API route.
  - Current response groups counts by DOMAIN (grades / deadlines / discussions). UX needs grouping by PLATFORM (Canvas / Ed). Extend the response schema by tagging each domain with its source platform (`canvas` or `ed`); frontend aggregates by platform for display.
  - Render two platform rows: Canvas, Ed. Each row shows a spinner → checkmark + aggregated counts (e.g., "Canvas: 8 courses, 124 deadlines, 92 announcements synced").
- **Tone/consistency:** adopt the existing brand voice (friendly-precise, no emoji, serif titles) already used in `AuthFormCard.tsx` and `SuccessOverlay.tsx`. No new illustrations.

### ONBD-02 — Setup edge cases (area C resolved)

- **Invalid token in TokenStep:** surface (a) "Token last validated: never" or timestamp if cached, (b) inline troubleshoot checklist: "Check token is copied whole / hasn't been regenerated / belongs to the right platform", (c) "Test connection" button that calls the validation endpoint before save.
- **API unreachable (5xx / network):** show retry with exponential backoff — 3 attempts at 2s / 4s / 8s, then stop and present "We can't reach {platform}. This is usually a {platform} outage. Retry later." with a manual retry button.
- **Sync partial failure:** SuccessStep renders the per-domain row as "Canvas: done, 8 courses" + "Ed: failed (network) — Retry". A "Retry failed only" button re-triggers only the failed adapter, not the whole sync.
- **TokenStep skip re-validate:** after a token is successfully validated once in this setup session, cache `{platform, validated_at}` in `sessionStorage` under key `uniboard.setup.tokenValidated`. When user navigates back/forward within the setup flow and the cached entry is < 5 minutes old and matches the same token value (hash it — do not store raw), skip the re-validation network call. On any token input change, invalidate the cache.

### AUTH-HARDEN-01 — Google OAuth (area D resolved)

- **Provider:** Google. Enable in Supabase dashboard (production) and `supabase/config.toml` `[auth.external.google]` block (local dev, secrets via env vars). No PR adds raw secrets.
- **Placement:** Google button appears on LoginForm AND RegisterForm (above the password input, separated by "or"). NOT on SetupPage (user is already authenticated by then).
- **Account merge policy (architectural decision — single-user context):**
  - Rely on **Supabase's default identity-linking**: when a user signs in with Google using an email that already exists as a password-based account, Supabase links the Google identity to the existing `auth.users` row automatically (because our SMTP confirmation is off, we'll explicitly verify the Google email path is still treated as verified — Google guarantees this).
  - **We do NOT build a custom merge flow.** If default linking surfaces a conflict (e.g., two distinct rows), the error is logged to Sentry and the user sees a generic "Sign-in failed — contact support" message. Acceptable because the only real-world case is the developer's own account, which is recoverable manually.
  - **Post-OAuth profile creation (CORRECTED after research):** existing `handle_new_user()` trigger already fires on OAuth signups and creates the `profiles` row — BUT it reads `raw_user_meta_data->>'display_name'`, while Google OAuth populates `full_name`. One-line migration adds a fallback: `COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', email)` so Google users get a real display name not their email.
- **Redirect handling (CORRECTED after research):** `/auth/callback` does NOT exist yet. Mirror the existing `/auth/confirm` route pattern to create a new `/auth/callback/page.tsx` that exchanges the OAuth code via `supabase.auth.exchangeCodeForSession()` then redirects to `/setup` if no tokens configured, else `/dashboard`.

### AUTH-HARDEN-02 — USYD banner (area E resolved)

- **Placement:** RegisterForm only (not LoginForm — users who already have accounts don't need the onboarding-style nudge). Show as a dismissible info banner above the form fields.
- **Trigger:** always shown (not conditional on email input) because registration forms don't know the email domain until the user types. Copy frames USYD users as the primary audience.
- **Copy (EN) — CORRECTED after research (confirmations are OFF so signup itself sends no email; the Mimecast concern applies to later password-reset and recall emails):** "USYD student? Password-reset and account emails from UniBoard (sender `noreply@uniboard.uk`) often land in Mimecast Held Messages. **Sign in with Google is recommended** to bypass the issue entirely."
- **Copy (CN):** matching translation in `frontend/i18n/locales/zh/auth.json`.
- **Dismiss state:** persist dismissal in `localStorage` under `uniboard.banner.usydRegister`. Re-show after 30 days.

### AUTH-HARDEN-03 — Resend email button (area F resolved)

- **Scope (CORRECTED after research):** signup confirmation is permanently OFF, so there is no "resend signup confirmation" to surface. **Apply the Resend button to the password-reset check-email flow only** (`ForgotPasswordForm.tsx` success state). That flow IS live post-Phase-32 and is the legitimate use case.
- **Also:** the post-registration "check your email" state in `RegisterForm.tsx` (lines 66–87) is currently showing a confusing message given confirmations are off. Update its copy to say "Account created — sign in now" with a direct "Go to login" CTA. No resend button there (nothing to resend).
- **Button UI (password-reset state):** below the "Back to login" link. Label: "Resend email". While in cooldown: label becomes "Resend in 00:{seconds}" and button is disabled.
- **Cooldown logic:** 60s countdown, tracked in component state (no server round-trip). Counter starts on initial password-reset request AND on every subsequent resend click.
- **Resend action:** calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` again. On success → toast "Reset email resent". On failure → toast with error message + allow immediate retry (no cooldown on failed send).
- **Reputation guard:** since cooldown is client-only, a determined user could refresh the page to bypass. Acceptable because (a) Supabase enforces server-side `max_frequency = "1s"` already, and (b) the 60s UX friction is the primary goal, not hard-enforcement.

### AUTH-HARDEN-04 — Document confirmation OFF

- **Scope:** documentation-only. No code change in `supabase/config.toml` for production (Supabase Studio already has it off per Phase 32 close-out). Local `config.toml` line 205 (`enable_confirmations = true`) stays true for local dev per local-vs-prod parity; add a comment explaining the divergence.
- **Artefacts to update:**
  - `.planning/PROJECT.md` — note permanent status + the reasoning (Mimecast quarantine, domain reputation).
  - `docs/UniBoard_TRD_v2.md` §7 (security) and §16 (deployment) — update email confirmation section to reflect permanent-off decision.
  - `supabase/config.toml` — add a `# NOTE: production has enable_confirmations=false — see PROJECT.md` comment.

### Claude's Discretion

- File layout of new Python email service (`src/services/email.py` vs `src/services/email/__init__.py`) — pick whichever matches the existing services/ conventions.
- Exact Resend email template markup (as long as it hits the content bullets above).
- i18n key naming for new strings.
- Unit test file naming for new services.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level specs
- `.planning/ROADMAP.md` — Phase 33 section, success criteria
- `.planning/REQUIREMENTS.md` — EMAIL-03, AUTH-HARDEN-01..04, ONBD-01..02 acceptance bullets
- `.planning/phases/33-token-lifecycle-onboarding/.continue-here.md` — paused-discuss decisions and scope expansion rationale (read for narrative, but this CONTEXT.md supersedes for authoritative decisions)
- `docs/UniBoard_TRD_v2.md` — §7 (security), §13 (frontend architecture), §16 (deployment)
- `CLAUDE.md` (project root) — stack, validation commands, known pitfalls

### Prior phase CONTEXT docs to align tone/patterns with
- `.planning/phases/29-sentry-hardening/29-CONTEXT.md` — observability patterns (Sentry envelope for new server-side code)
- `.planning/phases/31-e2e-verification-ai-config/31-VALIDATION.md` — UAT style to mirror

### Codebase touchpoints (do not re-discover — these are the extension surfaces)
- `src/sync/scheduled.py:124` — `check_token_health()`: extend with recall-email branch (inject `now: datetime | None = None` for testability, no freezegun)
- `src/models/user.py` — `Profile` model: add `recall_email_sent_at` column (migration required)
- `src/email/ses.py` — existing SES sender to reuse
- `src/services/recall_email.py` — NEW module composing SES sender + DeadlineService
- `src/services/deadline.py` — existing `get_deadlines(user_id, start_date, end_date)` is the query to use
- `supabase/migrations/` — migration to (1) add `recall_email_sent_at`, (2) patch `handle_new_user()` trigger to COALESCE `display_name` with `full_name`
- `frontend/components/setup/WelcomeStep.tsx` — small copy touch
- `frontend/components/setup/TokenStep.tsx` — skip re-validate + edge case copy
- `frontend/components/setup/SuccessStep.tsx` — per-domain progress + retry-failed-only button
- `frontend/components/auth/LoginForm.tsx` — add Google OAuth button
- `frontend/components/auth/RegisterForm.tsx` — USYD banner + Google OAuth + Resend button on check-email state
- `supabase/config.toml:309` — template pattern for `[auth.external.*]`
- `supabase/migrations/` — add new migration for `recall_email_sent_at`

### External docs (for planner's research phase)
- Supabase Auth docs: Identity Linking, Google OAuth setup
- Resend Python SDK docs: `send_email` transactional API
- Next.js App Router `/auth/callback` conventions (already in repo)

</canonical_refs>

<specifics>
## Specific Ideas / Constraints Carried Forward

- **From `project_sync_progress_ux` memory:** SuccessStep currently shows a generic spinner with no per-domain breakdown. This phase is the one that adds the per-domain view. Schema fix already done in prior work — this phase only owns the UX piece.
- **From `project_ux_improvements_backlog` memory:** TokenStep skip-re-validate was previously deferred; this phase owns it.
- **From Phase 29 (Sentry):** every new server-side failure path must send a structured error to Sentry with a tag like `phase=33` or a feature-scoped tag. New Resend failures, new OAuth errors, new migration conflicts — all instrumented.
- **From Phase 31 (observability):** the DB pool fix is in place; new async queries should use the standard session factory, no custom session wiring.
- **Branch:** `feature/gsd-33-token-lifecycle-onboarding` (already created off `main` at commit `a467478`).

</specifics>

<deferred>
## Deferred Ideas

- **Email preferences UI** (opt-out of recall emails, digest frequency picker) — Phase 36.
- **Push notifications for token expiry** — Phase 35.
- **Account-merge admin tooling** — not needed in single-user context; revisit if/when the product has multiple users.
- **Token auto-refresh** — impossible (no refresh tokens from Canvas/Ed); not revisited.
- **Apple / Microsoft OAuth** — not needed; USYD Workspace is Google-only.

</deferred>

---

*Phase: 33-token-lifecycle-onboarding*
*Context gathered: 2026-04-15 — synthesized from paused-discuss state + single-user architectural defaults*
