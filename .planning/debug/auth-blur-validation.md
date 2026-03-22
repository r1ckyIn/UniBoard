---
status: diagnosed
trigger: "Form validation errors appear on blur. User wants validation ONLY on submit click."
created: 2026-03-21T00:00:00Z
updated: 2026-03-21T00:01:00Z
---

## Current Focus

hypothesis: CONFIRMED — react-hook-form useForm is configured with mode: "onBlur" in both LoginForm and RegisterForm
test: read useForm calls in both components
expecting: mode property set to "onBlur"
next_action: return diagnosis

## Symptoms

expected: Validation errors should only appear when user clicks the submit button
actual: Validation errors appear on blur (when user clicks away from a field)
errors: Form validation fires on blur event
reproduction: Open auth page, type in a field, click away from it — validation error appears immediately
started: Phase 03 auth page implementation

## Eliminated

## Evidence

- timestamp: 2026-03-21T00:00:30Z
  checked: LoginForm.tsx line 30
  found: useForm configured with `mode: "onBlur"` — this tells react-hook-form to validate on blur events
  implication: Direct cause of blur validation in login form

- timestamp: 2026-03-21T00:00:30Z
  checked: RegisterForm.tsx line 38
  found: useForm configured with `mode: "onBlur"` — same setting as LoginForm
  implication: Direct cause of blur validation in register form

- timestamp: 2026-03-21T00:00:45Z
  checked: LoginForm.test.tsx line 117-132
  found: Test "shows inline error on blur when email is invalid" explicitly tests blur validation behavior (types invalid email, tabs away, expects error). This test will FAIL after the fix and must be updated.
  implication: Test needs to be rewritten to trigger validation via submit instead of blur

## Resolution

root_cause: Both LoginForm.tsx (line 30) and RegisterForm.tsx (line 38) configure react-hook-form with `mode: "onBlur"`, which triggers validation whenever a field loses focus. The fix is to change to `mode: "onSubmit"` so validation only runs when the form is submitted.
fix:
verification:
files_changed: []
