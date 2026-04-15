## Plan 33-07 deferrals (2026-04-15)

### Pre-existing typecheck error in RegisterForm.tsx
- File: `frontend/components/auth/RegisterForm.tsx`
- Error: `(80,12): error TS2304: Cannot find name 'Mail'.`
- Cause: Parallel-agent (likely 33-05 Google OAuth) has uncommitted changes that removed `Mail` from imports but left a usage at line 80
- Status: NOT my plan's scope. Will resolve when 33-05 commits its work or via a pre-PR cleanup
- Verification impact: typecheck fails globally but my own files (tokenCache.ts, TokenStep.tsx, SuccessStep.tsx, WelcomeStep.tsx) typecheck cleanly when checked independently

## Plan 33-05 — Out-of-scope discoveries

### Lint warnings in frontend/__tests__/auth/callback-route.test.ts (from Plan 33-04)

Pre-existing warnings introduced by Plan 33-04 (commit 82db052):
- Line 16: `_table` unused
- Line 17: `_cols` unused
- Line 18: `_col` unused, `_val` unused

All are `@typescript-eslint/no-unused-vars` on mock function params. Fix: prefix with underscore (already done) is not enough under this rule config; add `// eslint-disable-line` or destructure only needed args. Deferred to Plan 33-07 (final cleanup) or a follow-up fix.

### Pre-existing test failures (unrelated to 33-05)

- `__tests__/setup/SetupGuard.test.tsx` (4 failures) — "No intl context found" — missing NextIntlClientProvider in test setup. Pre-dates Plan 33-05.
- (possibly others in the full test suite — only ran focused tests per verify block in plan)
