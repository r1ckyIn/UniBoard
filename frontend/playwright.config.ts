// Playwright configuration for Phase 38 Plan 04 — first-paint pixel-diff suite.
//
// Env gating: the perf specs read `PERF_TEST_PASSWORD`/`PERF_TEST_EMAIL` and
// will `test.skip()` cleanly when the password secret is absent (CI without
// the secret + local dev without .env.local). This is the Phase 32.1
// "real-data harness" pattern: specs land as infrastructure, users wire
// credentials out-of-band.
//
// Locale: zh-CN primary (D-C4). English locale stays in manual UAT to keep
// the CI spec count bounded.
//
// Diff tolerance: maxDiffPixelRatio 0.02 (D-C4) — strictest reading of
// Success Criterion #2 ("no SkeletonCard visible to the naked eye").
//
// Existing artifacts respected: tests/e2e/perf/coldstart.spec.ts and
// measure-coldstart.ts from Phase 38 P03 continue to live here; coldstart.spec
// is self-gated via test.skip(true, ...) until future enablement.

import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  // Sequential runs keep screenshot determinism; the suite is bounded
  // (6 pixel-diff tests + 1 skipped coldstart sample) so parallel gives
  // no meaningful wall-clock win and risks flaky diffs.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",

  use: {
    baseURL: BASE_URL,
    locale: "zh-CN",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  expect: {
    toHaveScreenshot: {
      // D-C4: strict pixel-diff, permits 2% pixel-ratio drift for
      // anti-aliasing + sub-pixel font render variance across runners.
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
    },
  },

  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  // Local dev assumes `pnpm dev` is running on port 3001 in another
  // terminal. In CI, the workflow spins up `pnpm build && pnpm start`
  // explicitly in the job steps (we do NOT use `webServer` here because
  // Next.js's build step is long enough that we want separate CI step
  // visibility + caching in front of it).
  webServer: undefined,
});
