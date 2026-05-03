# Phase 40 — Deferred Items (out-of-scope discoveries)

> Items discovered during plan-01 execution that are NOT caused by Wave-1 changes
> and therefore not auto-fixed per the SCOPE BOUNDARY rule. Tracked here for
> future phase planning (Phase 41/42 candidates).

---

## DEFERRED-40-01: 23 pre-existing test failures from missing next-intl provider in test setup

**Discovered during:** Plan-01 Task 2 sweep verification (pnpm test --run).

**Confirmed pre-existing:** Yes. Verified by `git stash` + re-run on the
pre-sweep working tree → identical 23 failures, identical 5 failed test files,
identical pass/skip counts (`5 failed | 69 passed | 15 skipped (89)`,
`23 failed | 514 passed | 74 todo (611)`). The plan-01 verbose-form sweep
modifies className strings only and cannot affect runtime test setup.

**Affected files (5 test files, 23 tests):**
- `__tests__/course-detail/CourseDetailPage.test.tsx` (5 tests)
- `__tests__/deadlines/DeadlineCard.test.tsx` (6 tests)
- `__tests__/deadlines/DeadlinesPage.test.tsx` (4 tests)
- `__tests__/layout/AppShell.test.tsx` (4 tests)
- `__tests__/setup/SetupGuard.test.tsx` (4 tests)

**Root cause:** Components consuming `useLocale()` / `useTranslations()` from
`next-intl` are rendered without a `NextIntlClientProvider` wrapper in these
tests. Error: "No intl context found. Have you configured the provider?"

**Why not fixed in plan-01:** Pre-existing; outside Wave-1 scope (cva primitive
extraction + verbose-form sweep + ESLint extension).

**Recommended fix path:** Phase 41 A11Y kickoff or a dedicated test-infra
plan. Add a shared `renderWithIntl()` wrapper in `src/test/setup.ts` (or
`__tests__/_helpers/renderWithIntl.tsx`) that wraps render() with
`<NextIntlClientProvider locale="en" messages={...}>`. Migrate the 5 affected
test files to use it.

**Validation against plan-01 success criteria:**
The plan-01 `<success_criteria>` requires "All 22 unit tests pass (8 Button +
6 Input + 4 Phase 39 + 4 Phase 40 ESLint fixtures)". Plan-01 scoped tests pass
(see Task 4 verification). Pre-existing 23 failures in unrelated test files
do NOT block plan-01 closure per SCOPE BOUNDARY rule.
