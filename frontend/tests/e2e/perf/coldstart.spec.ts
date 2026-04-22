// @ts-nocheck — placeholder spec; @playwright/test installs in Phase 38 P04.
//
// Playwright spec for Phase 38 PERF-03 cold-start measurement.
//
// STATUS: Deferred — @playwright/test is not installed until Phase 38 P04.
//         For Phase 38 measurement, use the sibling standalone runner:
//           frontend/tests/e2e/perf/measure-coldstart.ts
//         plus the GH Actions workflow:
//           .github/workflows/railway-coldstart-measure.yml
//
// Once P04 installs @playwright/test, this spec can be activated by:
//   1. Removing the `@ts-nocheck` comment at the top of this file
//   2. Removing the `test.skip(true, ...)` guard below
// The spec then captures one sample per invocation against the Railway
// `/health` endpoint — looping + percentile computation remain the
// workflow's responsibility to keep the spec short and reusable.
//
// Why keep this file now: the plan records it as an anchor location so P04
// can extend it without extra planning. The file is excluded from Vitest
// (vitest.config.ts globs `__tests__/**/*.test.{ts,tsx}`, not
// `tests/e2e/**/*.spec.ts`), and `@ts-nocheck` silences the unresolved import
// until P04 installs the dependency.

import { test, expect } from "@playwright/test";

test.describe("Cold-start characterisation @perf @cold", () => {
  test.skip(true, "Pending @playwright/test install in Phase 38 P04");

  test("single sample to /health", async ({ request }) => {
    const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!RAILWAY_URL) throw new Error("NEXT_PUBLIC_API_URL not set");
    const endpoint = `${RAILWAY_URL.replace(/\/$/, "")}/health`;
    const start = Date.now();
    const resp = await request.get(endpoint, { timeout: 30_000 });
    const elapsed = Date.now() - start;
    expect(resp.ok()).toBe(true);
    // Emit machine-parsable marker consistent with measure-coldstart.ts contract.
    console.log(`SAMPLE_MS=${elapsed}`);
  });
});
