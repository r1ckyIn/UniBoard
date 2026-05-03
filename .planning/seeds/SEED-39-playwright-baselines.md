---
id: SEED-39
status: dormant
planted: 2026-04-30
planted_during: v3.0 / Phase 39 plan-04 (transition migration sweep)
trigger_when: visual drift reported in motion or Phase 40 components, OR v3.1 milestone kickoff, OR Phase 40 SHARED-01 wants visual safety net before refactoring shared components
scope: Small (~30 min once env vars are at hand)
---

# SEED-39: Phase 39 — Generate Playwright transition-parity baselines

## Why This Matters

Phase 39 plan-04 migrated 56 raw `transition-{all|colors} duration-{N|[Xs]}` className occurrences (plus 21 Form C `transition-[<property>] duration-N` cases plus 8 conflicting `ease-in-out` adjacencies) to motion tokens (`var(--motion-fast|base|slow)` + `var(--ease-claude-out)`). The PLAN's Task 3 (`checkpoint:human-verify`) was to generate Playwright visual regression baselines locking in the post-migration visual contract per D-11 (10 pages × baseline+hover at `maxDiffPixelRatio: 0.005`).

**Status: DEFERRED to production visual UAT** per user decision on 2026-04-30:
- Avoids local Playwright credential setup friction (PERF_TEST_PASSWORD + Supabase env vars not at hand)
- Visual verification happens on Vercel preview deployment after PR ships
- ESLint `no-restricted-syntax` rule from plan-3 already enforces zero raw transitions in CI — future regressions blocked at lint time, providing a different (lint-level) safety net

**What this means for MOTION-01:**
- Sweep + ESLint enforcement: COMPLETE (zero raw transitions remain in source; CI blocks future regressions)
- Pixel-diff regression coverage (D-11 visual gate): DEFERRED (this seed)
- REQUIREMENTS.md status: MOTION-01 is `partial`, not `complete`. Closing this seed turns it `complete`.

## When to Surface

**Trigger conditions** (any one):
1. Visual drift reported in motion behavior (hover/focus/transition feel) on production after Phase 39 PR ships
2. Phase 40 SHARED-01 (Card/Button/Input/Modal/Tooltip refactor) starts and wants visual safety net before touching shared component internals
3. v3.1 milestone kickoff — review via `/gsd-review-backlog` and decide whether to roll into v3.1 or further defer
4. Any Phase 40-43 PR that touches transition-className surface fails visual review and needs a regression baseline to land

## What's Required

**Environment** (user provides):
- `PERF_TEST_PASSWORD` (test user password, from .env or 1Password)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Tooling** (already in tree):
- `frontend/tests/e2e/phase39-transition-parity.spec.ts` — spec staged in plan-3, env-gated via `shouldRunPerfSuite()` (auto-skips when PERF_TEST_PASSWORD unset)
- `frontend/tests/e2e/perf/helpers/auth.ts` (`loginAsPerfTestUser`, `shouldRunPerfSuite`)
- `frontend/tests/e2e/perf/helpers/clock.ts` (`installFixedClock`)
- `frontend/playwright.config.ts` (port 3001, zh-CN locale, default `maxDiffPixelRatio: 0.02` — overridden per-call to 0.005)

**Effort estimate:** ~30 min wall time:
- 5 min — set env vars + restart dev server clean (`pkill -9 -f 'next dev' && rm -rf .next && pnpm dev`)
- 10 min — run `pnpm exec playwright test --grep "@phase39 @transition-parity" --update-snapshots` (10 pages × 2 states; first-run downloads Chromium ~200MB)
- 5 min — manual sanity check of 1-2 PNGs side-by-side with v2.0 prod (per CLAUDE.md `feedback_post_phase_production_verify.md`)
- 5 min — file count gate verification + commit
- 5 min — re-run without `--update-snapshots` to confirm 100% match

## How to Close

Follow the 9-step `<how-to-verify>` block in `.planning/phases/39-design-token-foundation/39-04-PLAN.md` Task 3:

1. **Set env vars**:
   ```bash
   export PERF_TEST_PASSWORD="<value>"
   export NEXT_PUBLIC_SUPABASE_URL="<value>"
   export NEXT_PUBLIC_SUPABASE_ANON_KEY="<value>"
   ```

2. **Restart dev server clean** (per CLAUDE.md `feedback_dev_server_cache.md`):
   ```bash
   pkill -9 -f 'next dev' 2>/dev/null || true
   cd frontend && rm -rf .next && pnpm dev &
   # wait until server logs "Ready in"
   ```

3. **Generate baselines**:
   ```bash
   cd frontend && pnpm exec playwright test --grep "@phase39 @transition-parity" --update-snapshots
   ```

4. **Re-run without --update-snapshots** to confirm 100% match:
   ```bash
   cd frontend && pnpm exec playwright test --grep "@phase39 @transition-parity"
   ```

5. **Visual sanity check** — open 1-2 PNGs from `frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/` and verify hover states preserved + no broken layout + transitions smooth.

6. **File count gate** (per ISSUE-39-07):
   ```bash
   ls frontend/tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/*.png | wc -l | awk '{exit ($1 < 18)}'
   echo $?  # MUST be 0 (file count >= 18)
   ```

7. **Commit baselines**:
   ```bash
   cd frontend && git add tests/e2e/__screenshots__/phase39-transition-parity.spec.ts-snapshots/
   git commit -m "test(39-04): commit Playwright baselines for transition-parity spec (10 pages × baseline+hover @ 0.5% diff threshold) — closes SEED-39"
   ```

8. **Stop dev server cleanup**:
   ```bash
   pkill -9 -f 'next dev' 2>/dev/null || true
   ```

9. **Update REQUIREMENTS.md** — flip MOTION-01 from `partial` to `complete`; remove the seed reference note; update the seed file status to `closed` with the commit hash.

## Dependencies

- `frontend/tests/e2e/phase39-transition-parity.spec.ts` (staged in plan-3, no changes needed — spec is ready to consume `--update-snapshots`)
- Phase 38 P04 helpers (`auth.ts`, `clock.ts`) — already in tree
- Playwright Chromium binary (~200MB first-run download via `pnpm exec playwright install chromium` if needed)
- User-provided test credentials (PERF_TEST_PASSWORD + Supabase env vars)

## Cross-References

- `.planning/phases/39-design-token-foundation/39-04-PLAN.md` — Task 3 full `<how-to-verify>` + `<acceptance_criteria>` + ISSUE-39-04 + ISSUE-39-07 context
- `.planning/phases/39-design-token-foundation/39-04-SUMMARY.md` — § "Deferred Work" + § "Decisions Made" decision log
- `.planning/phases/39-design-token-foundation/39-03-SUMMARY.md` — spec staging history
- `.planning/phases/39-design-token-foundation/39-CONTEXT.md` — D-11 visual regression gate definition
- `.planning/phases/39-design-token-foundation/39-RESEARCH.md` — Q3 (sed-vs-jscodeshift) + Q5 (reduced-motion) + Validation Architecture
- `.planning/REQUIREMENTS.md` — MOTION-01 partial status remediation note pointing here
- `.planning/ROADMAP.md` — Phase 39 plan 39-04 row notes "Task 3 deferred to prod UAT, see 39-04-SUMMARY.md Deferred Work"

## Status

- **Planted:** 2026-04-30 (during Phase 39 plan-04 execution)
- **Disposition:** Dormant. Awaiting trigger condition.
- **Closed by:** TBD — when triggered, close via the 9-step procedure above + flip MOTION-01 in REQUIREMENTS.md.
