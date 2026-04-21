---
phase: 38-first-load-performance
fixed_at: 2026-04-21T16:39:00Z
review_path: .planning/phases/38-first-load-performance/38-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 38: Code Review Fix Report

**Fixed at:** 2026-04-21T16:39:00Z
**Source review:** `.planning/phases/38-first-load-performance/38-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (Critical: 0, Warning: 2)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### WR-01: Unvalidated `Host` / `X-Forwarded-Proto` headers used to construct BFF origin with bearer token

**Files modified:** `frontend/lib/rsc/server-query-fn.ts`
**Commit:** `0b20ac8`
**Applied fix:** Introduced a three-tier `resolveOrigin()` helper that derives the BFF origin from trusted sources before falling back to request headers:

1. **`APP_ORIGIN` env var** — explicit opt-in for any environment (production, preview, self-hosted).
2. **`VERCEL_URL` env var** — automatically injected on Vercel production + preview deploys; always wrapped in `https://`.
3. **`headers()` fallback** — retained for local dev (`pnpm dev` on `:3001`) where neither env var is set.

This removes the factory's implicit trust in deployment-platform behaviour (Vercel/Railway edge normalisation) and blocks Host-header-override SSRF / JWT-exfiltration paths when the app is ever deployed behind a misconfigured proxy (nginx, ngrok, self-hosted). The resolution chain is documented in the file header; no call-site changes required because the fix is internal to `getServerApiClient`.

Verification:
- Re-read the modified file; fix present and imports intact.
- `pnpm typecheck` passed cleanly.
- `pnpm lint` (`--max-warnings 0`) passed cleanly.
- `pnpm vitest run __tests__/rsc/dashboard-prefetch.test.ts` — all 3 tests still pass (tests mock `next/headers` so behaviour is preserved for the local-dev fallback branch).

### WR-02: `static analysis` waterfall regex incorrectly matches `prefetchQuery` as `fetchQuery`

**Files modified:** `frontend/__tests__/rsc/dashboard-prefetch.test.ts`
**Commit:** `2d06f0a`
**Applied fix:** Tightened the waterfall-invariant regex from `/await[^\n]*?fetchQuery/g` to `/await[^\n]*?\.fetchQuery\b/g` (the word-boundary form suggested in REVIEW.md). The leading `\.` requires a literal dot before `fetchQuery`, which excludes `prefetchQuery` (whose preceding character is `e` in `.pre`). The trailing `\b` ensures `fetchQuery` is a standalone identifier boundary. Added an in-test comment explaining the guard + WR-02 reference so future maintainers don't accidentally regress.

Confirmed semantic correctness by running the old vs new regex on a synthetic test string containing two `prefetchQuery` calls and one `fetchQuery` call: old regex matched all 3 (false positive on both `prefetchQuery`s), new regex matched only the 1 true `fetchQuery` call.

Verification:
- Re-read the modified file section; regex change and comment present.
- `pnpm typecheck` passed cleanly.
- `pnpm lint` (`--max-warnings 0`) passed cleanly.
- `pnpm vitest run __tests__/rsc/dashboard-prefetch.test.ts` — all 3 tests pass, including the static-analysis test under the new stricter regex (dashboard page.tsx still has exactly 1 true awaited `.fetchQuery` call).
- Synthetic false-positive check confirmed: new regex rejects `prefetchQuery` calls while old regex matched them.

## Skipped Issues

None — all in-scope findings were successfully fixed.

---

_Fixed: 2026-04-21T16:39:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
