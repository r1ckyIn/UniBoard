// Standalone Node 22+ cold-start measurement runner.
// Usage:
//   NEXT_PUBLIC_API_URL=https://... node --experimental-strip-types tests/e2e/perf/measure-coldstart.ts
//
// Or via GH Actions (see .github/workflows/railway-coldstart-measure.yml) which
// drives the 15-min-idle sample loop externally via a shell for-loop — this
// script is responsible for ONE sample per invocation (single-shot).
//
// Contract:
//   - exit 0 + stdout `SAMPLE_MS=<n>` on success (HTTP 200 within TIMEOUT_MS)
//   - exit 1 + stderr FAIL line on timeout / non-2xx / network error
//
// Why standalone (not @playwright/test): Playwright is not installed in the
// repo yet (deferred to Phase 38 P04). Using Node's built-in fetch +
// AbortSignal.timeout keeps this measurement zero-dependency and runnable
// anywhere a recent Node lives.
//
// Computing p50/p95 is NOT done here — samples are aggregated by the workflow
// (or by a human running the script 10× with 15-min gaps) and written into
// coldstart-report.md.

// File scope: p50 calculations happen outside this script — see the
// railway-coldstart-measure.yml workflow's "Compute percentiles" step.

// Ensures TypeScript treats this file as a module so top-level `await` is allowed.
export {};

const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL;
if (!RAILWAY_URL) {
  console.error("NEXT_PUBLIC_API_URL not set");
  process.exit(1);
}

const TIMEOUT_MS = 30_000;
const endpoint = `${RAILWAY_URL.replace(/\/$/, "")}/health`;
const start = Date.now();

try {
  const resp = await fetch(endpoint, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // Prevent intermediate proxies from serving cached responses.
    cache: "no-store",
    headers: { "user-agent": "uniboard-coldstart-measure/1.0" },
  });
  const elapsed = Date.now() - start;
  if (!resp.ok) {
    console.error(`FAIL status=${resp.status} elapsed=${elapsed}`);
    process.exit(1);
  }
  // Drain the response body so the request is considered fully complete.
  // (Railway sometimes streams the JSON body separately from TTFB.)
  await resp.text();
  console.log(`SAMPLE_MS=${elapsed}`);
  process.exit(0);
} catch (e) {
  const elapsed = Date.now() - start;
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`FAIL error=${msg} elapsed=${elapsed}`);
  process.exit(1);
}
