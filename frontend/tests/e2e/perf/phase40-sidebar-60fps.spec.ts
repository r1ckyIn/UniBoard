/**
 * Phase 40 SHARED-03 — Sidebar 60fps Intel Mac verification spec (env-gated stub).
 *
 * Mirrors Phase 39 SEED-39 closure procedure (frontend/tests/e2e/phase39-transition-parity.spec.ts):
 * - Authored in-tree as a stub
 * - Auto-skips when PERF_TEST_PASSWORD env var unset (CI passes vacuously)
 * - Run locally on Intel Mac with --update-snapshots when user provisions credentials:
 *     PERF_TEST_PASSWORD=*** npx playwright test phase40-sidebar-60fps --update-snapshots
 *
 * Two tests:
 * (1) hover-expand achieves >55fps median frame timing (60fps target with 5fps headroom for jitter)
 * (2) collapse animation does NOT trigger main content reflow — main bounding box X-position stable
 *
 * Per memory: backdrop_filter_intel_mac.md — "GPU paint-cost family" of regressions documented
 * 4 subtypes (backdrop-filter, bleeding shadow, gradient-position shimmer, large-element opacity
 * fade); the v2.0 width-animated sidebar fell into the "bleeding shadow" subtype that the
 * Phase 40 transform-based two-layer DOM eliminates by construction (transform is GPU-composited
 * + outer 68px [contain:layout_paint] confines paint cost + main content padding-left:68px is
 * invariant across hover/expand/collapse).
 *
 * Per RESEARCH Pattern 10 + Q8 + Phase 39 SEED-39 carry-forward.
 */
import { test, expect } from "@playwright/test";
import { loginAsPerfTestUser, shouldRunPerfSuite } from "./helpers/auth";

test.describe(
  "@phase40 @sidebar-60fps — Sidebar 60fps Intel Mac (SHARED-03)",
  () => {
    test.skip(
      !shouldRunPerfSuite(),
      "Phase 40 SHARED-03 60fps verification requires PERF_TEST_PASSWORD + Supabase env vars (Phase 38 P04 + Phase 39 P03 gate). Baseline generation deferred to production human UAT on Intel Mac per Phase 39 SEED-39 carry-forward pattern."
    );

    test.beforeEach(async ({ page }) => {
      await loginAsPerfTestUser(page);
    });

    test("hover-expand achieves >55fps median on Sidebar (Intel Mac target)", async ({
      page,
    }) => {
      await page.goto("/timetable");
      // /timetable is the most paint-dense page (7x30 grid lines + events) per
      // Phase 39 LEARNINGS — worst-case stress test for sidebar paint cost.

      // Capture frame timing during hover-induced expand.
      await page.evaluate(() => {
        (window as unknown as { __sidebarFrames: number[] }).__sidebarFrames =
          [];
        let last = performance.now();
        const onFrame = (t: number) => {
          const w = window as unknown as { __sidebarFrames: number[] };
          w.__sidebarFrames.push(t - last);
          last = t;
          if (w.__sidebarFrames.length < 60) {
            requestAnimationFrame(onFrame);
          }
        };
        requestAnimationFrame(onFrame);
      });

      await page.locator("aside").hover();
      await page.waitForTimeout(800); // allow 60 frames to capture

      const frames: number[] = await page.evaluate(
        () => (window as unknown as { __sidebarFrames: number[] }).__sidebarFrames
      );
      const median = [...frames].sort((a, b) => a - b)[
        Math.floor(frames.length / 2)
      ];
      const fps = 1000 / median;

      // 60fps target = 16.67ms per frame; allow 5fps headroom for jitter.
      expect(fps).toBeGreaterThan(55);
    });

    test("collapse animation does not trigger main content reflow", async ({
      page,
    }) => {
      await page.goto("/timetable");
      const sidebar = page.locator("aside");
      await sidebar.hover();
      await page.waitForTimeout(300); // allow expand to settle

      // Capture main content's bounding box before collapse.
      const before = await page.locator("main").boundingBox();

      // Trigger collapse by hovering off.
      await page.mouse.move(800, 400);
      await page.waitForTimeout(300);

      const after = await page.locator("main").boundingBox();

      // Main content X-position MUST be stable (transform is internal to sidebar's
      // inner panel; outer <aside> never animates width per D-40-08).
      expect(after?.x).toBe(before?.x);
    });
  }
);
