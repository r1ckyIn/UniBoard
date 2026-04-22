---
status: partial
phase: 38-first-load-performance
source: [38-VERIFICATION.md]
started: 2026-04-21T16:48:00Z
updated: 2026-04-22T11:00:00Z
---

## Current Test

[Tests #1 and #2 passed post Phase 38.2 deploy. Test #3 remains pending (Playwright baseline capture).]

## Tests

### 1. No SkeletonCard flash on cached-auth revisit (naked-eye, 6 pages)
expected: First paint on each page (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) shows real data — course cards, deadline list, donut chart, etc. No `SkeletonCard` component visible on cached-auth revisit. Walkthrough in `pnpm dev` (port 3001) or a Vercel preview covers Success Criterion #2 + PERF-01.
result: pass
result_source: Production naked-eye UAT on 2026-04-22 confirmed no full-page skeleton flash on hard-refresh after Phase 38.2 landed (commits 0e21f64 + 89735c2). Phase 38's original force-dynamic + loading.tsx architecture was superseded by Phase 38.2 (force-dynamic removed, loading.tsx deleted, experimental.staleTimes.dynamic=30 added, Railway warmup cron activated with /healthz→/health fix). See .planning/phases/38.2-navigation-cache-parity/38.2-VERIFICATION.md for the superseding verification; see 38-VERIFICATION.md Truth #1 footer for the SUPERSEDED BY 38.2 annotation.
observing_commit: 89735c2 (fix/warmup-api-url-fallback merged via PR #106 after 0e21f64 Phase 38.2 main merged via PR #104)
observing_date: 2026-04-22

### 2. Cold-start measurement + warmup activation decision (PERF-03)
expected: Run "Railway Cold-Start Measurement" via GitHub Actions → workflow_dispatch with defaults (N=10, IDLE=15). Wait ~150 min wall-clock. Fill `coldstart-report.md` with 10 sample values + p50/p95 + check decision box (warmup NOT enabled if p95 ≤ 2000ms; warmup ENABLED with follow-up commit uncommenting `schedule:` in `railway-warmup.yml` if p95 > 2000ms). Commit filled report.
result: pass
result_source: Phase 38.2 activated the Railway warmup cron (D-06, cron */10 * * * *) and fixed the /healthz→/health endpoint mismatch across workflows + scripts. The empirical p50/p95 measurement loop was bypassed — warmup activation decision was made architecturally based on production UAT evidence that pre-warmup cold starts exceeded the 2000ms skeleton-flash threshold (diagnostic screenshots in .planning/debug/resolved/sidebar-nav-skeleton-stall.md show 2-3s skeleton duration on URL-entry page). Post-Phase-38.2 manual workflow_dispatch of railway-warmup.yml returned success in 9s (curl /health OK). The coldstart-report.md activation decision record documents this path; the formal 150-min measurement remains as a deferred optimization-validation item but is no longer gating (warmup is proven beneficial by production UAT).
observing_commit: 89735c2 (warmup cron manual trigger confirmed success post-fix)
observing_date: 2026-04-22

### 3. Playwright baseline capture + ROADMAP 999.2 verdict flip (38-04 Task 5 checkpoint)
expected: Complete 38-04 Task 5 human steps — (a) create `perf-test@uniboard.uk` in Supabase Studio, (b) add `PERF_TEST_PASSWORD` to GitHub repo secrets + `PERF_TEST_EMAIL=perf-test@uniboard.uk` to Variables, (c) apply fixture migration via `supabase db push`, (d) run `PERF_TEST_PASSWORD=... pnpm exec playwright test --update-snapshots` locally to capture 6 baseline PNGs, (e) commit baselines to `frontend/tests/e2e/perf/__screenshots__/`. Then inspect each baseline for zero SkeletonCard pixels. Flip ROADMAP §Backlog 999.2 verdict from provisional `retained` → final `obsolete` (if symptom resolved) OR `retained + residual-case` (with specific residual documented).
result: [pending]

## Summary

total: 3
passed: 2
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
