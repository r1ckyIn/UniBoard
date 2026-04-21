---
phase: 38-first-load-performance
reviewed: 2026-04-21T06:33:22Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - .github/workflows/frontend-ci.yml
  - .github/workflows/railway-coldstart-measure.yml
  - .github/workflows/railway-warmup.yml
  - frontend/__tests__/query/server.test.ts
  - frontend/__tests__/rsc/create-prefetched-page.test.tsx
  - frontend/__tests__/rsc/dashboard-prefetch.test.ts
  - frontend/app/[locale]/(dashboard)/courses/page.tsx
  - frontend/app/[locale]/(dashboard)/deadlines/page.tsx
  - frontend/app/[locale]/(dashboard)/digest/page.tsx
  - frontend/app/[locale]/(dashboard)/page.tsx
  - frontend/app/[locale]/(dashboard)/predict/page.tsx
  - frontend/app/[locale]/(dashboard)/timetable/page.tsx
  - frontend/eslint.config.mjs
  - frontend/lib/query/server.ts
  - frontend/lib/rsc/create-prefetched-page.tsx
  - frontend/lib/rsc/server-query-fn.ts
  - frontend/playwright.config.ts
  - frontend/tests/e2e/perf/coldstart.spec.ts
  - frontend/tests/e2e/perf/first-paint.spec.ts
  - frontend/tests/e2e/perf/helpers/auth.ts
  - frontend/tests/e2e/perf/helpers/clock.ts
  - frontend/tests/e2e/perf/measure-coldstart.ts
  - supabase/migrations/20260420000001_phase38_perf_test_seed.sql
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-04-21T06:33:22Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 38 first-load performance delivers a well-structured RSC prefetch + HydrationBoundary pattern across 6 pages, a cold-start measurement infrastructure with appropriate human-decision gating on the warmup cron, and a Playwright pixel-diff baseline harness with idempotent fixture seeding. The architecture demonstrates strong security posture around the critical `T-38-01` cross-request isolation invariant (verified in tests), the `T-38-03` auth gate (empty dehydrate for unauthed), and the `D-B4` silent-degrade model (per-query Sentry tagging via QueryCache onError).

The phase correctly implements the dashboard waterfall collapse (exactly one blocking `fetchQuery` on `/deadlines/upcoming`, all other queries parallel), full N-fanout on Predict (no cap, no batching per `D-B3`), and consumer-driven queryKey parity across all pages. Response-shape aliases are rederived per-page with explicit `.json<T>()` type parameters as mandated by the Wave 1 typecheck-gate recovery.

Two Warning-level findings concern defense-in-depth around host-header trust in `getServerApiClient` and a deviation in `.env` visibility for perf credentials. Six Info-level findings are stale-comment cleanups, regex brittleness, and minor hardening suggestions. No Critical issues found; no blocking bugs.

## Warnings

### WR-01: Unvalidated `Host` / `X-Forwarded-Proto` headers used to construct BFF origin with bearer token

**File:** `frontend/lib/rsc/server-query-fn.ts:22-28`
**Issue:** `getServerApiClient` derives `origin` from the incoming request's `Host` and `X-Forwarded-Proto` headers, then sends `Authorization: Bearer ${accessToken}` (the user's Supabase JWT) to that origin via ky. On properly configured Vercel/Railway deployments the edge normalises these headers, making the risk low in production; however, the factory itself provides no allow-list / origin validation and will happily forward the JWT to whatever origin the request headers report. If the app is ever deployed behind a proxy that permits client-supplied `Host` overrides (misconfigured nginx, self-hosted setups, local dev over ngrok), an attacker could trigger server-side exfiltration of the per-user JWT.

Mitigating factors: (1) Vercel & Railway do normalise Host/X-Forwarded-Proto for their edges; (2) BFF routes under `/api/v1/*` are same-origin by design. But the current implementation places full trust in deployment-platform behaviour with no defensive layer.

**Fix:** Prefer a configuration-sourced origin over request headers. Introduce an env var (e.g., `NEXT_PUBLIC_SITE_URL` or `APP_ORIGIN`) and fall back to `headers()` only in local dev:

```ts
export async function getServerApiClient(accessToken: string) {
  const configured = process.env.APP_ORIGIN;
  let origin: string;
  if (configured) {
    origin = configured.replace(/\/$/, "");
  } else {
    const h = await nextHeaders();
    const host = h.get("host") ?? "localhost:3001";
    const proto = h.get("x-forwarded-proto") ?? "http";
    origin = `${proto}://${host}`;
  }

  return ky.create({
    prefixUrl: `${origin}/api/v1`,
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
}
```

At minimum, add a runtime assertion that `host` matches a configured domain allowlist in production.

### WR-02: `static analysis` waterfall regex incorrectly matches `prefetchQuery` as `fetchQuery`

**File:** `frontend/__tests__/rsc/dashboard-prefetch.test.ts:196-204`
**Issue:** The regex `/await[^\n]*?fetchQuery/g` matches any line containing `await` followed (on the same line) by the substring `fetchQuery`. Because `prefetchQuery` ends with `fetchQuery`, the pattern will count `await queryClient.prefetchQuery({...})` calls as `fetchQuery` matches. Today's `page.tsx` structure avoids false positives only because `await` is applied to `Promise.all(...)` / `Promise.allSettled(...)` wrappers rather than individual `prefetchQuery` calls. A future refactor that replaces an in-array `prefetchQuery(...).catch(...)` with an inlined `await queryClient.prefetchQuery(...)` statement would silently break the invariant: the test would still pass (since `matches.length <= 2` tolerates false positives below the threshold) until the count exceeds 2, at which point the assertion becomes confusing.

**Fix:** Use a word boundary / negative look-behind to ensure `fetchQuery` is standalone:

```ts
// Correct: fetchQuery NOT preceded by `pre`
const matches = source.match(/await[^\n]*?(?<!pre)fetchQuery/g) ?? [];
expect(matches.length).toBeLessThanOrEqual(2);
```

Alternatively, tighten with a word-boundary form that only matches the method call shape:

```ts
const matches = source.match(/await[^\n]*?\.fetchQuery\b/g) ?? [];
```

The `\.fetchQuery\b` form excludes `prefetchQuery` because the preceding character is `.pre` → the `\.` doesn't match before `prefetchQuery`.

## Info

### IN-01: Stale `@ts-nocheck` + ESLint ignore entry after @playwright/test was installed in P04

**File:** `frontend/tests/e2e/perf/coldstart.spec.ts:1` and `frontend/eslint.config.mjs:21-24`
**Issue:** The `coldstart.spec.ts` header comment and the `eslint.config.mjs` ignore entry both state that `@playwright/test` "installs in Phase 38 P04" — but per the phase context P04 has already landed and `@playwright/test` IS now in `package.json`. The `@ts-nocheck` pragma masks any real type errors inside the file, and the ESLint ignore means changes to this spec will skip lint until the exclusion is removed.

**Fix:** Remove the `@ts-nocheck` line, remove the `"tests/e2e/perf/coldstart.spec.ts"` entry from the ESLint ignores array, and update the header comment to reflect the spec's actual status (self-gated via `test.skip(true, ...)` pending an explicit activation decision).

### IN-02: `<Suspense>` wrappers on digest/predict/timetable have no `fallback` prop

**File:** `frontend/app/[locale]/(dashboard)/digest/page.tsx:30`, `frontend/app/[locale]/(dashboard)/predict/page.tsx:52`, `frontend/app/[locale]/(dashboard)/timetable/page.tsx:59`
**Issue:** `<Suspense>` is declared without a `fallback` prop, so any child suspension renders nothing (React default). For Phase 38's "no skeleton flash on cached-auth revisit" goal this is intentional — but if the RSC prefetch misses for any reason (empty dehydrate on unauth, upstream failure that the silent-degrade path still proceeds past), the user sees a blank region instead of a skeleton. Document the intent or pass `fallback={null}` explicitly so reviewers understand the design choice.

**Fix:** Either pass `fallback={null}` explicitly or add a one-line comment above each `<Suspense>` block explaining the absent fallback:

```tsx
{/* No fallback: RSC prefetch populates cache server-side; missed prefetch falls through to the component's internal loading states. */}
<Suspense>
  <DigestPage />
</Suspense>
```

### IN-03: `run` parameter accepts `async` function but comment says "returns nothing"

**File:** `frontend/lib/rsc/create-prefetched-page.tsx:64-68`
**Issue:** The JSDoc-style comment on the `run` parameter states "Should return nothing" but the signature is `(ctx: PrefetchContext) => Promise<void>` — the function must return a Promise (or it's unawaited). The `await run(...)` at line 111 requires a thenable. Callers who pass a synchronous `run` that doesn't return a promise will not have errors caught correctly (though the sync-throw case still works via try/catch). Minor documentation correctness only.

**Fix:** Update the comment to state "Must return a Promise (declare with `async`); resolved value is ignored":

```ts
// Caller decides what to prefetch. Must be async (returns a Promise<void>);
// the resolved value is ignored — side effects on queryClient are the contract.
run?: (ctx: PrefetchContext) => Promise<void>;
```

### IN-04: `getServerApiClient` does not defensively reject empty `accessToken`

**File:** `frontend/lib/rsc/server-query-fn.ts:21`
**Issue:** The function trusts its caller (`createPrefetchedPage`) to have verified `session.access_token` is non-empty, but defends nothing if called elsewhere. A caller passing `""` would produce the header `Authorization: Bearer ` (bare `Bearer`, no token), which the BFF may or may not reject. In a future refactor that exports `getServerApiClient` to more callers, this becomes a silent-failure channel.

**Fix:** Add a runtime assertion (fail-closed):

```ts
export async function getServerApiClient(accessToken: string) {
  if (!accessToken) {
    throw new Error(
      "getServerApiClient called with empty accessToken — ensure the caller has validated the Supabase session before invoking.",
    );
  }
  // ... rest of function
}
```

### IN-05: Coldstart workflow percentile math has a subtle corner case for N < 3

**File:** `.github/workflows/railway-coldstart-measure.yml:93-95`
**Issue:** `P50_IDX=$(( (N + 1) / 2 ))` picks the middle element (1-indexed) which is correct for odd N but biased for even N (picks the lower median). For N=2 it picks index 1 (smaller of the two), potentially under-reporting p50 by a meaningful fraction on cold-start measurements. `P95_IDX` via `awk` ceiling is correct. Not a bug in the `N=10` default path; flagged only because the input allows `N >= 1` and someone running a quick N=2 sanity check may get surprising output.

**Fix:** Either document the median behaviour (lower median for even N) or use linear interpolation:

```bash
# For even N, compute average of two middle elements.
if [ $((N % 2)) -eq 0 ]; then
  MID1=$((N / 2))
  MID2=$((N / 2 + 1))
  V1=$(printf "%s\n" "$SORTED" | sed -n "${MID1}p")
  V2=$(printf "%s\n" "$SORTED" | sed -n "${MID2}p")
  P50=$(( (V1 + V2) / 2 ))
else
  P50_IDX=$(( (N + 1) / 2 ))
  P50=$(printf "%s\n" "$SORTED" | sed -n "${P50_IDX}p")
fi
```

### IN-06: Supabase fixture seed migration does not update `dedup_key` on conflict

**File:** `supabase/migrations/20260420000001_phase38_perf_test_seed.sql:189-193`
**Issue:** The `ON CONFLICT (id) DO UPDATE SET` block updates `title`, `due_date`, `weight`, `description` — but NOT `dedup_key`. If a prior version of this fixture had been applied with different dedup_keys (e.g., during iterative development), re-running this migration would leave stale dedup_keys in place. With the unique index `ix_deadlines_dedup`, stale keys don't break insertion of new rows but could confuse downstream sync logic. The current values are stable (`phase38-fixture-a1/-mt/-lab2`), so this is only a concern for the "migration applied against a non-clean state" scenario.

**Fix:** Include `dedup_key` and `source_id` in the DO UPDATE SET list for full idempotency:

```sql
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  due_date = EXCLUDED.due_date,
  source_id = EXCLUDED.source_id,
  weight = EXCLUDED.weight,
  description = EXCLUDED.description,
  dedup_key = EXCLUDED.dedup_key;
```

Note: updating dedup_key under the unique constraint is safe only if no other row already holds the new value. Since these fixture keys are phase-38-scoped strings, collision is impossible.

---

_Reviewed: 2026-04-21T06:33:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
