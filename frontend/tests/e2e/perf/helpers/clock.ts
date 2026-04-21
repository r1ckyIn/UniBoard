// Time-freezing helper for Phase 38 P04 pixel-diff determinism.
//
// Freezes Date, Performance.now, and setTimeout/setInterval scheduling so
// deadline `days_remaining` calculations produce stable UI across runs.
// Must be called BEFORE page.goto() per Playwright clock docs.
//
// Reference: D-C4 in 38-CONTEXT.md (frozen clock =
// 2026-04-01T08:00:00+10:00 == 2026-03-31T22:00:00Z). Fixture deadlines in
// 20260420000001_phase38_perf_test_seed.sql are anchored to this instant:
//   deadline-1 → 2026-04-08 (7d out)
//   deadline-2 → 2026-04-15 (14d out)
//   deadline-3 → 2026-04-22 (21d out)

import type { Page } from "@playwright/test";

export const FROZEN_CLOCK_ISO = "2026-04-01T08:00:00+10:00" as const;

/**
 * Install a frozen clock on the given Playwright page.
 *
 * Wraps `page.clock.install()` (Playwright 1.45+) so specs have a single
 * import point and the frozen instant lives in one place.
 */
export async function installFixedClock(page: Page): Promise<void> {
  await page.clock.install({ time: new Date(FROZEN_CLOCK_ISO) });
}
