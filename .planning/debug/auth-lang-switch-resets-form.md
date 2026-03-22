---
status: investigating
trigger: "Language switcher on register form resets to login form"
created: 2026-03-21T00:00:00Z
updated: 2026-03-21T00:00:00Z
---

## Current Focus

hypothesis: Language switcher triggers a full navigation/page reload which resets React state
test: Read language switcher implementation and auth form state management
expecting: Language switcher uses router.push or Link causing re-mount, form mode is only in React useState
next_action: Read auth page, language switcher, and i18n routing code

## Symptoms

expected: Switching language on register form should keep the register form visible
actual: Switching language resets the page to the login (sign in) form
errors: none (functional bug, not error)
reproduction: Go to auth page -> switch to register form -> click language switcher -> form resets to login
started: Phase 03 initial implementation

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
