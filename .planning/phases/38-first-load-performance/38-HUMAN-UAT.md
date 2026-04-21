---
status: partial
phase: 38-first-load-performance
source: [38-VERIFICATION.md]
started: 2026-04-21T16:48:00Z
updated: 2026-04-21T16:48:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. No SkeletonCard flash on cached-auth revisit (naked-eye, 6 pages)
expected: First paint on each page (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) shows real data — course cards, deadline list, donut chart, etc. No `SkeletonCard` component visible on cached-auth revisit. Walkthrough in `pnpm dev` (port 3001) or a Vercel preview covers Success Criterion #2 + PERF-01.
result: [pending]

### 2. Cold-start measurement + warmup activation decision (PERF-03)
expected: Run "Railway Cold-Start Measurement" via GitHub Actions → workflow_dispatch with defaults (N=10, IDLE=15). Wait ~150 min wall-clock. Fill `coldstart-report.md` with 10 sample values + p50/p95 + check decision box (warmup NOT enabled if p95 ≤ 2000ms; warmup ENABLED with follow-up commit uncommenting `schedule:` in `railway-warmup.yml` if p95 > 2000ms). Commit filled report.
result: [pending]

### 3. Playwright baseline capture + ROADMAP 999.2 verdict flip (38-04 Task 5 checkpoint)
expected: Complete 38-04 Task 5 human steps — (a) create `perf-test@uniboard.uk` in Supabase Studio, (b) add `PERF_TEST_PASSWORD` to GitHub repo secrets + `PERF_TEST_EMAIL=perf-test@uniboard.uk` to Variables, (c) apply fixture migration via `supabase db push`, (d) run `PERF_TEST_PASSWORD=... pnpm exec playwright test --update-snapshots` locally to capture 6 baseline PNGs, (e) commit baselines to `frontend/tests/e2e/perf/__screenshots__/`. Then inspect each baseline for zero SkeletonCard pixels. Flip ROADMAP §Backlog 999.2 verdict from provisional `retained` → final `obsolete` (if symptom resolved) OR `retained + residual-case` (with specific residual documented).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
