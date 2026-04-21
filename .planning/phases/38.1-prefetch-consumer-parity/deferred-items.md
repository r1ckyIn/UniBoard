# Plan 38.1-03 — Deferred Items

Pre-existing test failures in `frontend/__tests__/**` that are NOT caused by Plan 38.1-03
(Predict + Timetable prefetch parity) and are out of scope per the SCOPE BOUNDARY rule.

## Pre-existing vitest failures (baseline verified on commit 9be33b2 before Task 2)

All fail with the same root cause: `Error: No intl context found. Have you configured the provider? See https://next-intl.dev/docs/usage/configuration#server-client-components` when a component calls `useLocale()` without the test wrapping the render in a NextIntlProvider.

| Test file | Failures |
|-----------|----------|
| `__tests__/course-detail/CourseDetailPage.test.tsx` | 5 |
| `__tests__/deadlines/DeadlineCard.test.tsx` | 6 |
| `__tests__/deadlines/DeadlinesPage.test.tsx` | 4 |
| `__tests__/layout/AppShell.test.tsx` | 4 |
| `__tests__/setup/SetupGuard.test.tsx` | 4 |

Root cause: components using `useLocale()` / `useTranslations()` need `NextIntlClientProvider` in their test render harness. This predates Phase 38.1 entirely.

## Expected parity test failures (Plan 02 scope — dashboard + digest)

| Test | Case | Owner |
|------|------|-------|
| `__tests__/rsc/prefetch-consumer-parity.test.ts` | `dashboard: every client useQuery hook is prefetched on the server` | Plan 38.1-02 |
| `__tests__/rsc/prefetch-consumer-parity.test.ts` | `digest: every client useQuery hook is prefetched on the server` | Plan 38.1-02 |

Plan 38.1-02 runs concurrently in a separate worktree modifying `dashboard/page.tsx` + `digest/page.tsx`. After both plans merge, all 8 cases in prefetch-consumer-parity.test.ts will be GREEN.
