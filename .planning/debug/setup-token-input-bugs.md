---
status: diagnosed
trigger: "Investigate two issues: X clear button not clickable, Canvas token regex wrong"
created: 2026-03-22T00:00:00Z
updated: 2026-03-22T00:00:00Z
---

## Current Focus

hypothesis: Two independent bugs confirmed — see Resolution
test: N/A (root causes found)
expecting: N/A
next_action: Report diagnosis

## Symptoms

expected: (1) X button on TokenInput should be clickable to clear input. (2) Canvas token regex should accept real Canvas tokens like `3156~PR7xC...`
actual: (1) X button is not clickable at all. (2) Regex `/^\d{50,100}$/` rejects real Canvas tokens containing tilde and alphanumeric characters.
errors: No runtime errors — both are logic/design bugs.
reproduction: (1) Type in token input, trigger invalid status, try to click X icon. (2) Paste a real Canvas API token like `3156~PR7xC...` — validation always fails.
started: Since initial implementation (Phase 04)

## Eliminated

(none needed — root causes identified on first pass)

## Evidence

- timestamp: 2026-03-22
  checked: TokenInput.tsx lines 62-70
  found: XCircle icon is rendered inside a plain `<div>` with NO onClick handler and NO cursor:pointer styling. It is purely a visual status indicator, not a clear button.
  implication: Root cause #1 — the X icon was never wired as a clickable element.

- timestamp: 2026-03-22
  checked: TokenInput.tsx line 41 — parent container
  found: The input and status icon share `<div className="flex items-center relative">`. The icon is `absolute right-3` but sits as a sibling of the input, not inside a `<button>`. There is no `onClick` handler anywhere for clearing.
  implication: The component is missing clear-button functionality entirely.

- timestamp: 2026-03-22
  checked: lib/validations/token.ts lines 1-8
  found: `validateCanvasToken` uses regex `/^\d{50,100}$/` — digits only, 50-100 chars. Comment says "Canvas tokens are numeric strings" which is factually wrong.
  implication: Root cause #2 — regex was written based on incorrect assumption about token format.

- timestamp: 2026-03-22
  checked: Canvas LMS API documentation + user-reported format `3156~PR7xC...`
  found: Real Canvas API tokens use format `{numeric_id}~{base64_alphanumeric_string}`, e.g. `3156~PR7xC...`. They contain digits, tilde (`~`), and mixed-case alphanumeric characters. Total length is typically 60-70 characters.
  implication: The regex must accept `~` and alphanumeric characters, not just digits.

- timestamp: 2026-03-22
  checked: token-validation.test.ts
  found: Tests use `"1234567890".repeat(7)` (70 pure digits) as VALID_CANVAS_TOKEN. Tests are written to match the wrong regex, so they pass but don't reflect real-world tokens.
  implication: Tests need updating alongside the regex fix.

## Resolution

root_cause: |
  **Bug 1 (X button not clickable):** The XCircle icon in TokenInput.tsx (lines 63-69) is rendered inside a plain `<div>` with no `onClick` handler, no `role="button"`, no `cursor-pointer` class, and no `tabIndex`. It functions purely as a status indicator showing "invalid" state. There is no clear-input functionality implemented at all.

  **Bug 2 (Canvas token regex):** The `validateCanvasToken()` function in `lib/validations/token.ts` uses regex `/^\d{50,100}$/` which only accepts 50-100 pure digits. Real Canvas API tokens have format `{numeric_id}~{alphanumeric_string}` (e.g., `3156~PR7xCabc...`), containing digits, a tilde separator, and mixed-case alphanumeric + some special characters. The comment "Canvas tokens are numeric strings" is factually incorrect.

fix: |
  (not applied — diagnosis only)

verification: |
  (not applied — diagnosis only)

files_changed: []
