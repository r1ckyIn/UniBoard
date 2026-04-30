// Phase 39 plan-3 stub / plan-4 active — visual regression for MOTION-01
// transition migration sweep parity vs v2.0 baseline.
//
// Status:
//   Plan-3 (this commit) creates the spec file with the page list,
//   helper imports, and toHaveScreenshot calls but does NOT generate
//   baseline screenshots. The spec is functionally a no-op when
//   PERF_TEST_PASSWORD is unset (test.skip via shouldRunPerfSuite()).
//   Plan-4 runs the sed sweep + manual edge-case edits, then runs
//   `pnpm exec playwright test phase39-transition-parity.spec.ts
//   --update-snapshots` once on the migrated frontend to commit
//   baselines under tests/e2e/__screenshots__/.
//
// Convention divergence from Phase 38 P04 (first-paint.spec.ts):
//   - Spec lives at tests/e2e/ (NOT tests/e2e/perf/) since this is
//     Phase 39 work, not perf work. Playwright config testDir:
//     "./tests/e2e" + testMatch: "**/*.spec.ts" picks it up.
//   - maxDiffPixelRatio overridden per-call to 0.005 (D-11 stricter
//     than Phase 38's 0.02 default in playwright.config.ts).
//   - Tag with @phase39 @transition-parity for selective CI runs.
//   - 10 pages (D-11) vs Phase 38's 6 — adds course-detail/comp2017,
//     settings, setup, auth (no-login).

import { test, expect } from "@playwright/test";

import {
  loginAsPerfTestUser,
  shouldRunPerfSuite,
} from "./perf/helpers/auth";
import { installFixedClock } from "./perf/helpers/clock";

// 10 pages per Phase 39 D-11. Auth + setup don't require login but
// exercise the migrated transition utilities; mark with noLogin.
const PAGES = [
  { path: "/zh-CN", name: "dashboard" },
  { path: "/zh-CN/courses", name: "courses" },
  { path: "/zh-CN/courses/comp2017", name: "course-detail" },
  { path: "/zh-CN/deadlines", name: "deadlines" },
  { path: "/zh-CN/predict", name: "predict" },
  { path: "/zh-CN/digest", name: "digest" },
  { path: "/zh-CN/timetable", name: "timetable" },
  { path: "/zh-CN/settings", name: "settings" },
  { path: "/zh-CN/auth", name: "auth", noLogin: true },
  { path: "/zh-CN/setup", name: "setup" },
] as const;

test.describe(
  "@phase39 @transition-parity — interaction state pixel-diff (10 pages, zh-CN)",
  () => {
    // Skip the entire block when PERF_TEST_PASSWORD (or NEXT_PUBLIC_SUPABASE_*)
    // is unset — same env-gate idiom as Phase 38 P04 first-paint.spec.ts.
    test.skip(
      !shouldRunPerfSuite(),
      "Phase 39 visual regression requires PERF_TEST_PASSWORD + Supabase env vars (matches Phase 38 P04 gate). Baselines committed in plan-4 after migration sweep.",
    );

    test.beforeEach(async ({ page }) => {
      // Clock first so any client-side code reading Date during
      // hydration sees the frozen instant. Then seed session cookie
      // for cached-auth revisit.
      await installFixedClock(page);
      await loginAsPerfTestUser(page);
    });

    for (const { path, name, noLogin } of PAGES) {
      test(`${name} — transition migration preserves visual parity vs v2.0 baseline`, async ({
        page,
        context,
      }) => {
        if (noLogin) {
          // Clear any seeded auth cookies so the auth page renders
          // its logged-out state.
          await context.clearCookies();
        }

        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(() => r(null))),
        );

        // Capture baseline (default visual state).
        await expect(page).toHaveScreenshot(`${name}-baseline.png`, {
          fullPage: true,
          animations: "disabled",
          // D-11 stricter pixel-diff: 0.5% (vs Phase 38's 2% default).
          maxDiffPixelRatio: 0.005,
        });

        // Capture interaction state — hover on first interactive element.
        const firstInteractive = page
          .locator("button, a, [role='button']")
          .first();
        if (await firstInteractive.isVisible()) {
          await firstInteractive.hover();
          await page.evaluate(
            () => new Promise((r) => requestAnimationFrame(() => r(null))),
          );
          await expect(page).toHaveScreenshot(`${name}-hover.png`, {
            fullPage: true,
            animations: "disabled",
            maxDiffPixelRatio: 0.005,
          });
        }
      });
    }
  },
);
