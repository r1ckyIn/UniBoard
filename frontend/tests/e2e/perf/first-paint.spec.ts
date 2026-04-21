// Phase 38 Plan 04 — First-paint pixel-diff regression suite.
//
// Proves "no SkeletonCard flash on cached-auth revisit" on all 6 target pages
// (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) — the strictest
// reading of Phase 38 Success Criterion #2 (D-C1, D-C2, D-C3 in 38-CONTEXT.md).
//
// How the baseline works:
//   1) `installFixedClock(page)` freezes time to 2026-04-01T08:00:00+10:00
//      so deadline `days_remaining` rendering is deterministic (fixture
//      deadlines are at 7d / 14d / 21d from this instant).
//   2) `loginAsPerfTestUser(page)` signs the perf-test@uniboard.uk fixture
//      user in BEFORE navigation, so the very first paint is a cached-auth
//      revisit — no /auth redirect, no full-page re-render.
//   3) `page.goto(path)` hits the RSC route that Phase 38 P01/P02 rewrote.
//      The RSC prefetch runs server-side before HTML is flushed; first paint
//      should show real data, not SkeletonCards.
//   4) `toHaveScreenshot()` compares the first visible frame to a committed
//      baseline with maxDiffPixelRatio 0.02 (D-C4). The baselines live under
//      `__screenshots__/` and must be committed alongside the spec.
//
// Env gating — see helpers/auth.ts.shouldRunPerfSuite(). The entire describe
// block is `test.skip()`ed when the perf credentials are absent (CI without
// the secret, local dev without .env.local). This mirrors the Phase 32.1
// real-data harness pattern: spec lands as infrastructure; credentials are
// provisioned out-of-band.

import { test, expect } from "@playwright/test";

import {
  loginAsPerfTestUser,
  shouldRunPerfSuite,
} from "./helpers/auth";
import { installFixedClock } from "./helpers/clock";

// Pages in scope per Phase 38 D-B2 (6-page scope complete). zh-CN only —
// en stays in manual UAT to keep CI spec count bounded (deferred).
const PAGES = [
  { path: "/zh-CN", name: "dashboard" },
  { path: "/zh-CN/courses", name: "courses" },
  { path: "/zh-CN/deadlines", name: "deadlines" },
  { path: "/zh-CN/predict", name: "predict" },
  { path: "/zh-CN/digest", name: "digest" },
  { path: "/zh-CN/timetable", name: "timetable" },
] as const;

test.describe("Phase 38 P04 — first-paint pixel-diff (6 pages, zh-CN)", () => {
  // Skip the entire block when PERF_TEST_PASSWORD (or NEXT_PUBLIC_SUPABASE_*)
  // is unset. Prevents CI runs without the secret from failing with a blank
  // password error at login time — they just no-op instead.
  test.skip(
    !shouldRunPerfSuite(),
    "Perf suite requires PERF_TEST_PASSWORD + NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Skip is expected on CI forks + local dev without .env.local.",
  );

  test.beforeEach(async ({ page }) => {
    // Clock FIRST so any client-side code reading Date during hydration
    // sees the frozen instant. Then seed the session cookie so the first
    // navigation is a cached-auth revisit, not a /auth redirect.
    await installFixedClock(page);
    await loginAsPerfTestUser(page);
  });

  for (const { path, name } of PAGES) {
    test(`${name} — no skeleton flash on cached-auth revisit`, async ({
      page,
    }) => {
      // Navigation. Use `domcontentloaded` (not `networkidle`) because the
      // RSC prefetch has already resolved server-side by the time HTML is
      // flushed — we want to snapshot the first paint, not wait for
      // post-hydration refetches.
      await page.goto(path, { waitUntil: "domcontentloaded" });

      // Ensure webfonts are ready so the snapshot doesn't race with FOUT.
      // This is a one-time per-page await; NOT a networkidle wait which
      // would defeat the "first paint" semantics.
      await page.evaluate(() => document.fonts.ready);

      // Allow a single rAF for hydration to commit layout. Still runs
      // BEFORE any client-side useQuery refetch — useQuery's onMount
      // refetch is suppressed by the hydrated cache (staleTime 5min from
      // QueryProvider defaults).
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => r(null))),
      );

      await expect(page).toHaveScreenshot(`${name}-first-paint.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
