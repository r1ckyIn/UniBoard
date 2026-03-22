---
status: investigating
trigger: "UAT issue: auth page scrollbar appears/disappears causing layout shift"
created: 2026-03-21T00:00:00Z
updated: 2026-03-21T00:00:00Z
---

## Current Focus

hypothesis: No overflow-y: scroll rule on html/body — browser shows scrollbar only when content exceeds viewport (register form is taller than login form)
test: Check all CSS files for overflow-y rules on html/body
expecting: No overflow-y: scroll found — browser defaults to auto
next_action: Confirm root cause and return diagnosis

## Symptoms

expected: Scrollbar should always be present but visually hidden (no layout shift)
actual: Scrollbar appears/disappears based on content conditions causing layout shift
errors: none (visual issue)
reproduction: Navigate to auth page, switch between login/register forms, observe scrollbar toggling
started: Phase 03 auth page implementation

## Eliminated

## Evidence

- timestamp: 2026-03-21T00:01:00Z
  checked: globals.css body styles (line 112-119)
  found: body has overflow-x: hidden but NO overflow-y rule. Default browser behavior = overflow-y: visible (scrollbar appears only when content overflows)
  implication: Scrollbar appearance is entirely controlled by whether content exceeds viewport height

- timestamp: 2026-03-21T00:02:00Z
  checked: globals.css scrollbar styles (lines 160-170)
  found: Custom webkit scrollbar styling exists (5px width, transparent track, card-border thumb) but this only styles the scrollbar WHEN it appears — does not force it to always be present
  implication: Styling is fine, the issue is about scrollbar presence/absence, not its appearance

- timestamp: 2026-03-21T00:03:00Z
  checked: Auth layout (auth)/layout.tsx line 18
  found: Outer div uses min-h-screen, no overflow control. AuthPage.tsx line 40 also uses min-h-screen with no overflow rules
  implication: No component-level overflow rules either — all relying on default browser behavior

- timestamp: 2026-03-21T00:04:00Z
  checked: LoginForm vs RegisterForm content height
  found: LoginForm has 2 fields (email, password). RegisterForm has 4 fields (displayName, email, password, confirmPassword) plus PasswordStrengthMeter. Register form is significantly taller.
  implication: Login form fits within viewport (no scrollbar), register form may exceed viewport (scrollbar appears). Switching between them causes scrollbar to toggle → layout shift.

- timestamp: 2026-03-21T00:05:00Z
  checked: html element styles in globals.css line 108-110
  found: Only font-size: 15px set on html. No overflow rules on html element.
  implication: Confirms the root cause — neither html nor body has overflow-y: scroll

## Resolution

root_cause: The html element has no overflow-y: scroll rule. The browser defaults to showing the scrollbar only when content overflows the viewport. Since the register form is significantly taller than the login form (4 fields + password strength meter vs 2 fields), switching between login/register toggles the scrollbar on/off, causing a ~5px horizontal layout shift.
fix: Add overflow-y: scroll to the html element in globals.css to always reserve scrollbar space
verification:
files_changed: []
