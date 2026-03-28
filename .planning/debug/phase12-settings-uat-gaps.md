---
status: diagnosed
trigger: "Diagnose root causes for 5 UAT issues in Phase 12 (settings-page)"
created: 2026-03-26T11:00:00Z
updated: 2026-03-26T11:30:00Z
---

## Current Focus

hypothesis: All 5 issues diagnosed with root causes identified
test: N/A (diagnosis only)
expecting: N/A
next_action: Return structured diagnosis

## Symptoms

expected: Settings page UAT passes all 10 tests
actual: 5 issues found — sticky nav, GPA sync, notification text alignment, date line-break, dialog centering
errors: See individual diagnoses below
reproduction: Manual UAT testing
started: Phase 12 UAT

## Evidence

- timestamp: 2026-03-26T11:05:00Z
  checked: SettingsNav.tsx sticky positioning vs prototype CSS
  found: |
    SettingsNav uses `sticky top-[calc(56px+20px)]` which should work, BUT the parent
    `<main>` in AppShell.tsx has `overflow-y:auto` with `maxHeight: calc(100vh - var(--spacing-header-h))`.
    Sticky positioning does NOT work inside an overflow:auto container in the expected way
    relative to the viewport — it sticks relative to the scrolling ancestor.
    The `self-start` on SettingsNav is correct, but the issue is that the `<main>` element
    is the scroll container (overflow-y:auto), so `top-[calc(56px+20px)]` is wrong — the
    header is OUTSIDE the scroll container, so sticky top should be relative to the scroll
    container's top, not the viewport top. It should be `top-5` (20px) not `top-[calc(56px+20px)]`.
  implication: Nav sticks but at wrong offset, appearing to float in the middle instead of hugging the top

- timestamp: 2026-03-26T11:10:00Z
  checked: GPA target save flow — useUpdateProfile, mock API route, predict page initialization
  found: |
    1. GpaTargetSection calls `updateProfile.mutate({ gpa_target: gpaValue })` which sends PATCH /users/me
    2. Mock API route merges `{ ...mockUser, ...body }` but does NOT mutate the `mockUser` object — it returns
       a new object. The imported `mockUser` constant still has `gpa_target: 85.0`.
    3. After PATCH success, `invalidateQueries({ queryKey: userKeys.me() })` re-fetches GET /users/me,
       which returns the ORIGINAL `mockUser` with `gpa_target: 85.0` — overwriting the saved value.
    4. PredictPage reads `target_wam` from the GPA report fixture (`gpa.ts`), hardcoded to 85.0.
    5. Settings and Predict pages use completely different data sources (User.gpa_target vs GpaReport.target_wam),
       with no shared state or API-level sync between them.
  implication: Mock API is stateless — PATCH creates a new response but GET always returns the original fixture. The save "works" visually but is immediately overwritten by the cache invalidation refetch.

- timestamp: 2026-03-26T11:15:00Z
  checked: NotificationsSection.tsx description paragraph classes
  found: |
    Lines 103 and 147 both have `ml-[52px]` on the description paragraphs for GPA risk alert
    and email notifications. The ToggleRow component is a flex `justify-between` label, so
    the 52px left margin was intended to align under the label text (past the toggle width).
    But the toggle is on the RIGHT side (`justify-between`), not the left. So `ml-[52px]`
    creates an incorrect indentation from the left edge. The description should have `ml-0`
    (no left margin) to left-align with the label text above it.
  implication: Description text is indented 52px from the left when it should be flush left

- timestamp: 2026-03-26T11:20:00Z
  checked: ProfileSection.tsx date formatting and whitespace handling
  found: |
    Line 105: `format(new Date(user.created_at), "d MMM yyyy", { locale: dateFnsLocale })`
    In Chinese locale, this produces something like "2026年2月1日" or "1 2月 2026" depending on
    the locale formatting. The user reports "12月的1和2都分开了" — the date string wraps mid-word.
    The `<span>` container on line 103 has no `whitespace-nowrap` class, so the browser can
    line-break within the date string at any space or soft-break opportunity. The container is
    inside a flex row with `justify-between`, so the span can be squeezed by the Save button.
  implication: Date text breaks across lines because there is no whitespace-nowrap on the date span

- timestamp: 2026-03-26T11:25:00Z
  checked: DangerZoneSection.tsx dialog elements and CSS
  found: |
    The `<dialog>` elements on lines 89-117 and 120-157 use `showModal()` which should auto-center.
    However, the AppShell `<main>` has `overflow-y: auto` which creates a new stacking context.
    Native `<dialog>` with `showModal()` renders in the top layer and should center relative to
    viewport regardless — BUT the `<dialog>` elements lack explicit centering styles.
    There are no global dialog styles in globals.css. The default browser UA stylesheet for
    `<dialog>` uses `position: fixed; inset: 0; margin: auto;` but the Tailwind CSS reset
    (Preflight) resets `margin: 0` on all elements, which breaks the native auto-centering
    mechanism of `<dialog>`. Without `margin: auto` (or explicit `m-auto`), the dialog
    renders at `inset: 0` with `margin: 0`, placing it at the top-left.
  implication: Tailwind Preflight resets margin to 0, breaking native dialog centering

## Resolution

root_cause: See individual diagnoses in Evidence section
fix: See missing items per issue below
verification: N/A (diagnosis only)
files_changed: []
