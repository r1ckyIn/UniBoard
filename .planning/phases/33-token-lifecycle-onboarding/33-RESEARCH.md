# Phase 33: Token Lifecycle & Onboarding — Research

**Researched:** 2026-04-15
**Domain:** Scheduled email backup + OAuth auth path + onboarding polish
**Confidence:** HIGH (code surfaces verified); MEDIUM for Resend SDK and Supabase default-identity-linking behavior (training-data + docs)

---

## 1. Executive Summary

Five findings will meaningfully shape the plan; the planner will write incorrect tasks without them:

- **`DeadlineService.list_upcoming(user_id, horizon_days=14)` does NOT exist.** Only `get_deadlines(..., from_date, to_date, include_past=False)` exists (`src/services/deadline.py:128`). CONTEXT.md refers to a method that was never built. Plan MUST either add the method or use `get_deadlines` with explicit `from_date`/`to_date` in the EMAIL-03 recall task. This is a concrete spec error inherited from CONTEXT.md.
- **The codebase already has `SESEmailSender` (AWS SES via boto3)** at `src/email/ses.py`, actively called by `NotificationService` (`src/services/notification.py:94`). CONTEXT.md calls for adding Resend SDK. The planner MUST decide: (a) keep CONTEXT.md's Resend decision and add a parallel sender (two email transports in the codebase), or (b) reuse the existing SES sender (one transport, but changes CONTEXT.md). Flag this to the user before planning. Per CONTEXT.md wording ("Do NOT reuse Supabase Auth's SMTP"), SES-reuse IS consistent with the constraint — reason to confirm.
- **`GET /sync/status` and `POST /sync/trigger` already exist** (`src/web/routes/sync.py:188` and `:54`) and already return per-platform status (`canvas`/`ed` with `status` + `last_success`). The frontend already polls via `useSyncStatus`/`useSyncTrigger` (`frontend/hooks/use-sync.ts`) and SuccessStep already uses `refetchInterval: 3000`. ONBD-01 is therefore a **display refinement**, not new API/infrastructure. Per-domain counts are already aggregated in `SyncResults` (grades/deadlines/discussions). No new endpoint needed.
- **`handle_new_user()` trigger already creates profiles for ANY `auth.users` insert** (`supabase/migrations/00000000000001_initial_schema.sql:25-37,69-72`), including OAuth signups. AUTH-HARDEN-01 does NOT need a new trigger; `display_name` will default to `''` for OAuth users (Google metadata not mapped). Plan SHOULD include a one-line trigger update to pull `display_name` from Google's `raw_user_meta_data->>full_name` or similar, OR accept empty display name and require Settings update — ask the user.
- **Test infrastructure has no `freezegun` / `pytest-freezer`.** Existing scheduled-job tests (`tests/unit/test_token_health.py`) use `unittest.mock.patch` + `AsyncMock` to mock the session factory. Time-dependent code is tested by **passing `now` as a value, not by freezing time**. The 14-day absence check in EMAIL-03 should accept `now: datetime` as a default-argument parameter so tests can inject arbitrary timestamps without new deps.

---

## 2. Per-Requirement Findings

### EMAIL-03 (Recall Email)

**Q1. `Profile.last_sync_at` shape / `auth.users.last_sign_in_at` access.**
- `Profile.last_sync_at`: `Mapped[datetime | None]` with `DateTime(timezone=True)` (`src/models/user.py:44-46`). Timezone-aware.
- `auth.users` is Supabase-managed, NOT in SQLAlchemy models. Existing access pattern is raw SQL with `sqlalchemy.text`: see `src/services/notification.py:86-91` — `text("SELECT email FROM auth.users WHERE id = :uid")`. Same idiom for `last_sign_in_at`: `text("SELECT last_sign_in_at FROM auth.users WHERE id = :uid")`. `last_sign_in_at` is a built-in Supabase column (confirmed via official Supabase schema).
- For a batch query (recall-email job iterates all users), planner should use a single `text("SELECT id, last_sign_in_at FROM auth.users WHERE last_sign_in_at < :threshold")` rather than N+1 per-user queries.

**Q2. Resend Python SDK.**
- **LOW confidence — not verified via Context7.** Training-data recollection: package is `resend` (PyPI), latest major version as of 2025 ~1.x. Minimal shape: `import resend; resend.api_key = os.getenv("RESEND_API_KEY"); resend.Emails.send({"from": ..., "to": ..., "subject": ..., "html": ..., "text": ...})` — supports `html` and `text` in the same payload. Planner MUST run `uv add resend` and check actual API when implementing; alternatively reuse `SESEmailSender` (see Executive Summary #2).
- Env var convention: `RESEND_API_KEY`. If SES is reused, no new env var needed (AWS IAM already in Railway env).

**Q3. `DeadlineService.list_upcoming` — DOES NOT EXIST.**
- See Executive Summary #1. Closest existing method: `DeadlineService.get_deadlines(user_id, from_date=now, to_date=now+14d, include_past=False)` at `src/services/deadline.py:128-169`. Returns `list[DeadlineResponse]`; length == deadline count.
- Returns deadlines joined to `courses` and filters by `Course.user_id == user_id`. No N+1 issue.
- Planner MUST decide: add a thin `list_upcoming` wrapper (3 lines) or inline the call. Adding the wrapper matches CONTEXT.md spec and improves readability. Recommended: add wrapper.

**Q4. `recall_email_sent_at` migration — index needed?**
- Expected row count: single-user dev, but built for multi-user. Query is `SELECT ... WHERE canvas_token_status='expired' OR ed_token_status='expired'` (already runs in `check_token_health`, no index on those columns today — see `supabase/migrations/00000000000001_initial_schema.sql:51-52`). Adding `recall_email_sent_at` to the filter predicate adds one more `NULL` / `< now - 30d` comparison.
- Index cost/benefit: at <10k users, a partial index `WHERE recall_email_sent_at IS NULL OR recall_email_sent_at < now() - interval '30 days'` is not justified. Recommend: **no index**; revisit when user count exceeds 10k.
- Migration numbering: next file is `00000000000007_recall_email_sent_at.sql`. Single nullable `TIMESTAMPTZ` column, no default.

---

### AUTH-HARDEN-01 (Google OAuth)

**Q5. `supabase/config.toml` `[auth.external.google]` block.**
- Template already present for Apple (`config.toml:309-322`). Exact shape for Google (identical fields):
  ```toml
  [auth.external.google]
  enabled = true
  client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
  secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
  redirect_uri = ""  # default = {site_url}/auth/v1/callback
  url = ""
  skip_nonce_check = true  # required for local SPA-mode sign-in (per config.toml:319 comment)
  email_optional = false
  ```
- Env var names follow Supabase's `SUPABASE_AUTH_EXTERNAL_{PROVIDER}_{CLIENT_ID|SECRET}` convention (confirmed by the Apple template at line 313). Secrets NOT in git; set in Supabase dashboard for production, in local `.env` for dev.
- `site_url = "http://localhost:3001"` and `additional_redirect_urls = ["http://localhost:3001", "http://localhost:3001/auth/confirm"]` already set (`config.toml:150-152`). Planner should add `"http://localhost:3001/auth/callback"` too — see Q6.

**Q6. supabase-js `signInWithOAuth` redirect chain.**
- Package: `@supabase/supabase-js@^2.100.0`, `@supabase/ssr@^0.9.0` (`frontend/package.json:19-20`).
- **Current repo has NO `/auth/callback` route.** The only Next.js auth route is `/auth/confirm` (`frontend/app/auth/confirm/route.ts`) which handles `token_hash`+`type` via `verifyOtp` — that is the PKCE recovery/email-confirmation path, NOT the OAuth callback path.
- supabase-js OAuth flow with `@supabase/ssr`: call `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })` → Supabase hosts the OAuth dance → redirects back to `/auth/callback?code=...` → route calls `supabase.auth.exchangeCodeForSession(code)` → sets session cookie → redirects to `/setup` or `/[locale]`.
- **Planner MUST add `frontend/app/auth/callback/route.ts`** (new) with the `exchangeCodeForSession` pattern. Mirror `frontend/app/auth/confirm/route.ts` structure.
- Session is SSR-cookie-based (per `@supabase/ssr`); no client-side `onAuthStateChange` work required beyond existing `AuthProvider.tsx`.

**Q7. `ensure_profile()` trigger.**
- **EXISTS.** `handle_new_user()` at `supabase/migrations/00000000000001_initial_schema.sql:25-37`, wired via `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users` (lines 69-72).
- Current behavior: copies `raw_user_meta_data->>'display_name'` into profile; defaults to `''` if missing. Google OAuth writes `raw_user_meta_data` with keys like `full_name`, `name`, `email`, `avatar_url` — NOT `display_name`.
- **Recommendation for planner:** either (a) update `handle_new_user` to `COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')`, or (b) accept empty display_name for OAuth users and surface a "Set your display name" nudge in Settings. Option (a) is a 1-line migration, preferred.

**Q8. Identity linking / verified-email auto-link.**
- **MEDIUM confidence.** Supabase's default behavior (as of supabase-js v2.x and Supabase Auth GoTrue v2): when a user signs in via a new identity provider (e.g., Google) using an email that already matches an existing `auth.users` row, identity linking is **automatic IF the email is verified on both sides**. Google always returns verified emails. Password accounts with `enable_confirmations=false` (our case) have `email_confirmed_at = NULL` until confirmation, meaning the password account's email is technically unverified.
- **Risk:** Linking may NOT be automatic for password accounts created while `enable_confirmations=false` because Supabase may not have marked them as verified. Planner should verify behavior in a scratch environment OR explicitly set `email_confirmed_at = now()` on signup via a trigger — OR accept the CONTEXT.md policy that conflicts log to Sentry with a generic error (single-user context tolerates this).
- Setting to check: there is NO single toggle; linking is governed by the combination of email verification state on each identity. `auth.enable_manual_linking = false` (line 169) is unrelated — that controls the `linkIdentity()` API, not auto-linking on sign-in.

---

### AUTH-HARDEN-03 (Resend Button)

**Q9. supabase-js `auth.resend`.**
- Call shape: `await supabase.auth.resend({ type: 'signup', email: userEmail })`. Returns `{ data, error }`. Common error codes: `over_email_send_rate_limit` (server-side throttle), `email_address_invalid`.
- Server-side rate limit: `[auth.email] max_frequency = "1s"` (`config.toml:209`) is the minimum interval between any two emails to the same address. `[auth.rate_limit] email_sent = 100` per hour (`config.toml:178`) is the project-wide cap.
- Since CONTEXT.md locks email confirmation **permanently OFF**, `resend({type: 'signup'})` on this project actually has no confirmation to resend. **This is a functional contradiction** the planner should flag: a Resend button only matters when confirmation emails are being sent. Possibilities:
  1. CONTEXT.md's Resend button is scoped to the password-reset `check-email` state (also mentioned in CONTEXT.md AUTH-HARDEN-03 — "password-reset check-email state if one exists"); this is the live path.
  2. The button is reserved for a future re-enablement of confirmations.
- Recommended planner behavior: scope the Resend button to **password-reset emails only** (ForgotPasswordForm's post-submit state), because that's the real user-facing email path post-Phase-32. Ask the user to confirm.

---

### ONBD-01 (Per-domain Progress)

**Q10. Sync status endpoint.**
- **EXISTS.** `GET /sync/status` at `src/web/routes/sync.py:188-267`. Already returns `SyncStatusResponse { last_sync: { sync_id, status, started_at, completed_at, results: { grades, deadlines, discussions } }, platforms: { canvas: { status, last_success }, ed: { status, last_success } } }`.
- Per-domain record counts are already in `last_sync.results` (counts sourced from `sync_history` table via `SyncHistory` model, lines 212-233).
- The frontend's SuccessStep already polls at 3s (`SuccessStep.tsx:25`). For ONBD-01, the only backend change (if any) would be to ensure `status` values align with the "spinner → checkmark + counts" UI states — currently `is_syncing` check maps to `in_progress` vs `completed`. The UX spec in CONTEXT.md ("Canvas: 8 courses, 124 deadlines, 92 announcements") needs counts grouped by platform, not by domain; current payload groups by domain. **Gap:** the existing response groups `grades`/`deadlines`/`discussions` under a single `last_sync.results`, not under `canvas`/`ed`. Plan must either:
  - Add `per_platform_counts: { canvas: {...}, ed: {...} }` to the response (extends `SyncStatusResponse` schema), OR
  - Infer platform from domain on the frontend (grades+deadlines → Canvas; discussions → Ed).

**Q11. Sync adapter per-domain counts — data source.**
- Counts are persisted in `sync_history` table via `SyncHistory` model (see `src/models/sync_history.py`; schema migration `00000000000003_sync_history.sql`). Each sync task writes a row with `(user_id, domain, status, records_updated, started_at, completed_at)`.
- `/sync/status` already reads from this table (`sync.py:216-225`). Platform grouping is the only gap.

**Q12. Next.js polling with TanStack Query.**
- Precedent: `SuccessStep.tsx:23-27` uses `useQuery({ ...syncOptions.status(), refetchInterval: syncStarted && !timedOut ? 3000 : false, enabled: syncStarted })`. Polling cadence already set to 3s (CONTEXT.md said 2s — minor discrepancy; 3s is fine).
- Planner can tighten the exit condition (`refetchInterval: false` when both platforms report `success`|`failed`) to reduce wasted polls. Currently cuts off only when `syncStatus === 'completed' || 'failed'` in the overall `last_sync.status`.

---

### ONBD-02 (Edge Cases)

**Q13. Token validation endpoint.**
- Frontend call: `configureToken.mutateAsync({ platform, body: { token } })` from `useConfigureToken` (`TokenStep.tsx:60`). Find in `frontend/hooks/use-user.ts`.
- Endpoint path resolves via the generated OpenAPI types (`lib/api/types.gen.d.ts`); based on code grep the path is `POST /users/tokens/{platform}` (validating + storing in one call). Planner should verify by grepping `use-user.ts` when writing tasks. Note: **the current flow does validation-and-save together** — there's no separate "validate only" endpoint. CONTEXT.md's "Test connection button that calls the validation endpoint before save" may require a new endpoint, or adoption of a "validate-only" mode (e.g., `POST /users/tokens/{platform}?dry_run=true`).

**Q14. sessionStorage caching pattern.**
- No existing `sessionStorage` usage in `frontend/components/**` (only `localStorage` appears — `NotificationsSection.tsx:37`, `PredictPage.tsx:45`, zustand persist in `SetupGuard.tsx:15`). No helper wrapper — direct `window.sessionStorage.{getItem,setItem,removeItem}` with defensive `typeof window !== 'undefined'` check (Next.js SSR).
- Hashing: **Web Crypto API is sufficient and built-in** — `await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))` returns an `ArrayBuffer`; convert to hex. No need for `crypto-js` (not installed). Use Web Crypto to keep bundle size flat.
- Cache key per CONTEXT.md: `uniboard.setup.tokenValidated`, value shape `{[platform: 'canvas'|'ed']: { hash: string, validated_at: ISO8601 }}`.

---

### AUTH-HARDEN-02 (Banner)

**Q15. Banner component.**
- **No reusable `InfoBanner`/`Alert` component exists.** `frontend/components/` uses inline styled `<div>` patterns (e.g., `TokenStep.tsx:142-148` has a Shield icon + copy block in a rounded bordered container). Style vocabulary: rounded-lg, subtle tinted background `bg-[rgba(R,G,B,.04)]`, matching 12%-alpha border.
- Plan should build a minimal inline banner inside `RegisterForm.tsx` that matches this vocabulary (not a new reusable component) — consistent with the existing pattern of per-form styled blocks. Dismiss state via `localStorage['uniboard.banner.usydRegister']`.

**Q16. i18n setup.**
- **Single flat file per locale**: `frontend/messages/en.json` and `frontend/messages/zh.json`. NOT split into `auth.json`/`setup.json`. Keys are nested namespaces inside the flat JSON (e.g., `auth.login.title`, `setup.welcome.title` — confirmed in `LoginForm.test.tsx:10-25`). Add new keys under `auth.register.*` and `setup.tokens.*` as appropriate.
- Library: `next-intl` (locked at `4.8.3`). Uses `useTranslations('namespace')` with dot-path lookup.

---

### AUTH-HARDEN-04 (Documentation)

**Q17. TRD §7 / §16 current email-confirmation text.**
- Grep found: `docs/UniBoard_TRD_v2.md:1524` — `POST /auth/confirm-password` API spec (password reset confirmation, unrelated to signup email confirmation).
- No §7 or §16 paragraph currently documents Supabase signup email confirmation. **The "documentation update" in CONTEXT.md is actually an addition, not a modification.** Planner should add a new subsection (e.g., §7.X "Email Confirmation Policy" and §16.X "Supabase Auth Configuration") rather than edit a non-existent passage.

**Q18. `.planning/PROJECT.md` sections.**
- Existing headings (verified): `## What This Is`, `## Core Value`, `## Current State` (line 11), `## Requirements`, `## Context`, `## Constraints`, `## Milestone Structure`, `## Key Decisions`, `## Current Milestone: v3.0`, `## Evolution`.
- **Best location for permanent-off note: `## Key Decisions` (line 181)** — that's the architectural-decision record section, matching the nature of the decision (strategic, not transient). `## Current State` would be a weaker fit (describes present status, not locked policy).

---

### Integration & Test Infrastructure

**Q19. Scheduled-job test pattern / time mocking.**
- **No `freezegun` / `pytest-freezer` installed** (`pyproject.toml` dev deps reviewed). Existing pattern: `tests/unit/test_token_health.py` mocks `src.sync.scheduled._get_sync_session_factory` using `unittest.mock.patch` + `AsyncMock`. Time is **not frozen**; tests pass computed datetimes into fixtures when needed.
- **Recommendation:** design the recall-email branch with `now: datetime | None = None` default parameter that falls back to `datetime.now(UTC)`. Tests inject explicit `now` values (e.g., a user whose `last_sign_in_at` is `now - timedelta(days=15)` is "absent"). Avoids adding freezegun dep; matches existing project style.

**Q20. Frontend test pattern for supabase-js mocks.**
- Existing pattern in `frontend/__tests__/auth/LoginForm.test.tsx:41-57`: mock **the hook**, not supabase-js directly. `vi.mock("@/hooks/use-auth", () => ({ useLogin: () => mockLoginMutation, ... }))`. The hook is the contract boundary; individual supabase calls are implementation detail.
- For OAuth: plan to add a `useGoogleLogin()` or `useOAuthLogin('google')` hook in `frontend/hooks/use-auth.ts`, then mock that hook in LoginForm/RegisterForm tests. For Resend: add `useResendConfirmation()` hook similarly.
- `supabase-js` is only mocked directly in `__tests__/auth/confirm-route.test.ts` (route-level test, no hook available).

**Q21. CI validation commands.**
- Backend (`.github/workflows/backend-ci.yml`): `uv run ruff check .`, `uv run mypy --strict src/`, `uv run pytest tests/ -x --timeout=120` (env: `DEBUG=true`, `UNIBOARD_DISABLE_SYNC=true`).
- Frontend (`.github/workflows/frontend-ci.yml`): `pnpm lint` (`eslint --max-warnings 0`), `pnpm typecheck` (`tsc --noEmit`), `pnpm build`.
- No frontend `test` step in CI today — `pnpm test` (vitest) exists in scripts but isn't wired into `frontend-ci.yml`. Planner can either (a) add it to CI (small Phase 33 extension) or (b) run locally only. Per CLAUDE.md validation-loop rule, tests must be green locally before PR regardless.

---

## 3. Open Risks / Unknowns

| # | Risk | Planner Action |
|---|------|----------------|
| R1 | `DeadlineService.list_upcoming` doesn't exist | Add thin wrapper OR rewrite CONTEXT.md call to `get_deadlines(from_date, to_date)` |
| R2 | Resend SDK vs. existing SES sender | Clarify with user before plan: adopt Resend or reuse SES. CONTEXT.md locked Resend; code reality is SES. |
| R3 | `enable_confirmations=false` may break Supabase identity auto-linking for pre-existing password accounts | Accept generic error + Sentry log (CONTEXT.md decision) OR add `email_confirmed_at=now()` on password signup |
| R4 | `handle_new_user` does not read Google's `full_name` from OAuth metadata | Update trigger (1-line migration) or accept empty display_name |
| R5 | Resend button with `enable_confirmations=OFF` has no signup email to resend | Scope resend to password-reset flow only, OR park Resend behind a feature flag |
| R6 | Existing `/sync/status` groups counts by domain, not by platform | Extend response schema (add `per_platform_counts`) OR do platform inference on frontend |
| R7 | No `/users/tokens/{platform}?dry_run=true` — "Test connection" without save needs decision | Either add dry-run flag to existing endpoint OR add new `POST /users/tokens/{platform}/validate` |
| R8 | No `/auth/callback` Next.js route exists yet for OAuth PKCE | Create new route; mirror `/auth/confirm` structure |

---

## 4. Implementation Sequencing

Recommended topological order (the planner should split these across plans):

1. **Migration + model** — `recall_email_sent_at` column on `profiles` + `handle_new_user` trigger update for Google `full_name` → `00000000000007_*.sql`
2. **Email service foundation** — resolve R2 (Resend vs SES), create `src/services/email.py` wrapping chosen transport; templates in `src/email/templates/recall.html` + `.txt`
3. **Backend scheduler extension** — extend `check_token_health()` in `src/sync/scheduled.py` with recall branch; unit tests via `AsyncMock` + injected `now`
4. **Backend sync-status payload** — extend `SyncStatusResponse` with `per_platform_counts` if R6 resolved in favor of schema change
5. **Backend OAuth config** — `supabase/config.toml` `[auth.external.google]` block; local dev env vars documented in `.env.example`
6. **Frontend OAuth integration** — new `frontend/app/auth/callback/route.ts`; new `useGoogleLogin()` hook; button component inserted in LoginForm + RegisterForm (order: hook first, then tests-green, then UI)
7. **Frontend Resend button** — `useResendConfirmation()` hook; button in RegisterForm `emailSent` state (or password-reset state per R5)
8. **Frontend onboarding polish** — WelcomeStep copy; SuccessStep per-platform rows; TokenStep sessionStorage cache + Web Crypto SHA-256; edge-case retry UI
9. **Frontend USYD banner** — inline banner in RegisterForm + i18n keys (`en.json` + `zh.json`)
10. **Documentation** — TRD §7 + §16 additions; `.planning/PROJECT.md` `## Key Decisions` entry; `supabase/config.toml` comment on line 205

Dependencies: (1) blocks (2)(3); (2) blocks (3); (5) blocks (6); (6) blocks test-green on LoginForm/RegisterForm. (4) blocks (8) if R6 resolved via schema change.

Phase 29 Sentry pattern (from CONTEXT.md `<specifics>`): every new server-side failure path MUST tag `phase=33` in Sentry — applies to steps (2), (3), (4), and any new backend endpoint.

---

## 5. Validation Commands

From `UniBoard/CLAUDE.md` + `.github/workflows/*.yml`:

**Backend (run at repo root):**
```bash
uv run ruff check .
uv run mypy --strict src/
uv run pytest tests/ -x --timeout=120    # env: DEBUG=true UNIBOARD_DISABLE_SYNC=true
```

**Frontend (run from `frontend/`):**
```bash
pnpm install --frozen-lockfile
pnpm lint          # eslint --max-warnings 0
pnpm typecheck     # tsc --noEmit
pnpm build         # next build
pnpm test          # vitest (local only; not in CI yet)
```

**Supabase (local dev, run at repo root):**
```bash
supabase db reset          # applies migrations from scratch
supabase db push           # applies new migrations to remote
# Local dev stack
supabase start             # starts Postgres + Auth + Studio on ports 54321-54324
```

**Pre-commit hooks** (auto-runs; see `.claude/hooks/`): branch guard, commit-msg format, pre-commit ruff+mypy. Claude does NOT need to run these manually.

---

## 6. Sources

**HIGH (code verified in repo, 2026-04-15):**
- `src/sync/scheduled.py:124-175` — existing `check_token_health`
- `src/models/user.py:23-98` — Profile model
- `src/services/notification.py:83-107` — `auth.users` raw SQL pattern + existing SES email path
- `src/services/deadline.py:125-169` — `get_deadlines` (no `list_upcoming`)
- `src/web/routes/sync.py:188-267` — existing `/sync/status` endpoint
- `src/email/ses.py` — existing AWS SES sender
- `supabase/migrations/00000000000001_initial_schema.sql:25-72` — `handle_new_user` trigger
- `supabase/config.toml:146-322` — auth + external provider template
- `frontend/hooks/use-sync.ts` — polling hook
- `frontend/hooks/use-auth.ts` — auth mutations (no OAuth, no resend yet)
- `frontend/components/setup/SuccessStep.tsx:23-27` — TanStack Query `refetchInterval` pattern
- `frontend/app/auth/confirm/route.ts` — existing PKCE verify pattern (for OAuth callback to mirror)
- `frontend/__tests__/auth/LoginForm.test.tsx:41-77` — hook-mock pattern
- `tests/unit/test_token_health.py:1-60` — `AsyncMock` + `patch` pattern for scheduled jobs
- `.github/workflows/backend-ci.yml`, `frontend-ci.yml` — CI command surface
- `pyproject.toml`, `frontend/package.json` — dependency state

**MEDIUM (training + official docs, not verified this session):**
- Supabase Auth identity auto-linking behavior when password account has `email_confirmed_at IS NULL`
- Supabase OAuth redirect chain (`signInWithOAuth` → `/auth/callback?code=` → `exchangeCodeForSession`)
- Google OAuth `raw_user_meta_data` key names (`full_name`, `name`, `avatar_url`, `email`)

**LOW (training-data only — planner should verify before implementing):**
- Resend Python SDK exact API shape and current version
