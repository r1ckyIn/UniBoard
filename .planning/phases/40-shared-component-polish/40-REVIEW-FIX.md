---
phase: 40-shared-component-polish
fixed_at: 2026-05-03T06:30:00Z
review_path: .planning/phases/40-shared-component-polish/40-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 40: Code Review Fix Report

**Fixed at:** 2026-05-03T06:30:00Z
**Source review:** `.planning/phases/40-shared-component-polish/40-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (2 Critical + 8 Warning; 6 Info skipped per fix_scope=critical_warning)
- Fixed: 10
- Skipped: 0
- Status: all_fixed

**Gate state after fixes (verified inside isolated worktree):**
- `pnpm lint --max-warnings 0` -> clean (0 warnings, 0 errors)
- `pnpm typecheck` -> clean (`tsc --noEmit` exits 0)
- `pnpm build` -> succeeds (Next.js production build completes)
- `pnpm test --run` -> 538 passed, 23 failed
  - **All 23 failures are pre-existing**, not introduced by these fixes. They live in 5 test files (`__tests__/course-detail/CourseDetailPage.test.tsx`, `__tests__/deadlines/DeadlineCard.test.tsx`, `__tests__/deadlines/DeadlinesPage.test.tsx`, `__tests__/layout/AppShell.test.tsx`, `__tests__/setup/SetupGuard.test.tsx`) caused by `next-intl` mocks missing the `useLocale` export. None of those 5 files appear in this fix's `git diff --name-only ea2dbc4 HEAD` (15-file diff). Verified by checking out the pre-fix commit `ea2dbc4` and re-running the same 5 test files: 23 failed / 3 passed — identical numbers. This is documented for the developer to track in a follow-up that is out of Phase 40 review-fix scope.
  - **All 34 tests in fix-affected files pass** (Sidebar.test.tsx 6/6, StreamingAssistant.test.tsx 3/3, useStreamingText.test.ts 7/7, DangerZoneSection.test.tsx 8/8, NotificationsSection.test.tsx 5/5, sse-keyframes.test.ts 5/5).

## Fixed Issues

### CR-01: StreamingAssistant re-fades the entire accumulated text on every SSE chunk

**Files modified:** `frontend/hooks/useStreamingText.ts`, `frontend/components/shared/StreamingAssistant.tsx`, `frontend/__tests__/hooks/useStreamingText.test.ts`
**Commit:** `4ec9f3c`
**Applied fix:** Refactored `useStreamingText` to split source into a stable `prefix` (rendered without animation) and a `delta` (the most recent suffix, rendered with the chunk-fadein keyframe and keyed by chunkIndex). Held the split in state (not derived) so unrelated re-renders within one chunk window don't recompute it. `StreamingAssistant` renders `{prefix}<span key={chunkIndex}>{delta}</span><cursor/>`. Result: only the freshly arrived characters fade in per SSE chunk; already-rendered text stays stable. Tests rewritten to assert prefix+delta contract, non-prefix replacement collapses prefix to "", chunkIndex stable across no-op re-renders.

This fix bundles WR-08 (see below) since both required mutations to the same hook.

### CR-02: Sidebar active-state highlight quietly lost ~40% color saturation

**Files modified:** `frontend/components/layout/Sidebar.tsx`, `frontend/__tests__/components/layout/Sidebar.test.tsx`
**Commit:** `99918f8`
**Applied fix:** Restored the literal `bg-[rgba(217,119,87,0.18)]` value in both the main nav loop (line 106) and the bottom Settings nav loop (line 134). Lower-blast-radius than mutating `--color-orange-soft`, which would also affect Header focus rings, NotificationPanel unread row, and other consumers that depend on the 0.11 baseline. Sidebar.test.tsx assertion updated to query for the literal class — any future regression that reverts to `bg-orange-soft` will fail the test.

### WR-01: cancelAnimationFrame(innerRafId) may be called before innerRafId is assigned

**Files modified:** `frontend/components/dashboard/DeadlineTimeline.tsx`
**Commit:** `9d7e933`
**Applied fix:** Typed `innerRafId` as `number | undefined`; added an explicit `if (innerRafId !== undefined)` guard before `cancelAnimationFrame`. Documents intent and prevents misbehaviour if the scheduler primitive is ever swapped (e.g. clearTimeout, custom scheduler).

### WR-02: DangerZoneSection fires two unguarded mutations on disconnect

**Files modified:** `frontend/components/settings/DangerZoneSection.tsx`, `frontend/__tests__/settings/DangerZoneSection.test.tsx`, `frontend/messages/en.json`, `frontend/messages/zh.json`
**Commit:** `1e0f461`
**Applied fix:** Switched `handleDisconnect` from two synchronous `mutate()` calls to `await Promise.allSettled([mutateAsync(canvas), mutateAsync(ed)])`. One platform's failure no longer prevents the other from attempting. Surface success vs. partial-failure via Sonner toasts; close the dialog only on full success (leaving it open on partial failure lets the user retry without re-opening). New i18n keys `danger.disconnect.successAll` / `partialFailure` (en + zh). Test mock extended to expose `mutateAsync` returning a Promise; one new test case overrides Ed to reject and verifies the dialog stays open.

### WR-03: NotificationsSection.savePrefs uses empty deps but reads stale `prefs` via closure

**Files modified:** `frontend/components/settings/NotificationsSection.tsx`
**Commit:** `ddf260e`
**Applied fix:** Refactored `savePrefs` to take a functional updater `(prev) => next` instead of a fully-baked next-state object. `togglePref` and `setDigestFrequency` rewritten to pass updater fns, eliminating the closure dependency on `prefs`. `localStorage.setItem` moved inside `setPrefs` so it always sees the post-update next value. Future memoisation of `togglePref` (e.g. via `useCallback`) is now safe.

### WR-04: SettingsNav has redundant border-left utility AND inline style — inline always wins

**Files modified:** `frontend/components/settings/SettingsNav.tsx`
**Commit:** `46a5bbc`
**Applied fix:** Removed the conflicting `border-l-2 border-transparent` + active-state `border-l-[#d97757]` className utilities. Inline `style.borderLeftColor` is now the single source of truth for the left-border (kept because it cleanly toggles based on `isActive`). The className continues to own background + text-color + a non-overlapping `border-0` baseline.

### WR-05: Header outside-click effect briefly attaches no listener while transitioning between dropdowns

**Files modified:** `frontend/components/layout/Header.tsx`
**Commit:** `07bcea9`
**Applied fix:** Switched both bell and avatar `onClick` toggles from `setNotifOpen(!notifOpen)` (closure read) to `setNotifOpen((prev) => !prev)` (functional updater). Toggles are now always derived from the latest committed state, so rapid clicks (open NotificationPanel then immediately click avatar before React commits) cannot cancel a true→true toggle the user expected.

### WR-06: `--animate-streaming-cursor-blink` and `--animate-streaming-chunk-fadein` are dead theme tokens

**Files modified:** `frontend/app/globals.css`, `frontend/__tests__/styles/sse-keyframes.test.ts`
**Commits:** `7aae22a` (token removal) + `4e5537e` (sse-keyframes test follow-up)
**Applied fix:** Removed the two `--animate-streaming-*` tokens from `@theme` since no consumer referenced the generated `animate-streaming-*` utility classes. `StreamingAssistant.tsx` uses inline `animation: streaming-cursor-blink ...` for the cursor and `animate-[streaming-chunk-fadein_...]` arbitrary-value Tailwind utility for the chunk fade — both bypass the `@theme` tokens. Removing the dead tokens eliminates the maintenance trap where a future edit to swap timing would silently no-op.

The semantic alias `--motion-stream-cursor-period: 1s` and `--motion-stream-chunk-fadein: var(--motion-fast)` are KEPT (they document the timing contract even though they're not currently consumed via `--animate-*` wrappers). The `@keyframes streaming-cursor-blink` and `@keyframes streaming-chunk-fadein` definitions are KEPT (referenced by name from inline + arbitrary-value paths).

The legacy `sse-keyframes.test.ts > uses step-end timing for cursor blink` test grepped `globals.css` for the now-removed token line, so it correctly went red after the WR-06 fix landed. Test re-targeted at `StreamingAssistant.tsx`'s inline `animation:` declaration (the actual source of truth post-WR-06). Same Q7 invariant enforced (must contain `step-end infinite`, must NOT contain `alternate`).

### WR-07: Sidebar lost no a11y annotations but never had them — still a regression risk for the rewrite

**Files modified:** `frontend/components/layout/Sidebar.tsx`, `frontend/__tests__/components/layout/Sidebar.test.tsx`, `frontend/messages/en.json`, `frontend/messages/zh.json`
**Commit:** `1498cd9`
**Applied fix:** Added `aria-label={t("sidebarLandmark")}` to `<aside>` so screen readers announce a named landmark instead of a generic "complementary" region. Added `role="navigation"` + `aria-label={t("primaryNav")}` to the inner panel. Most importantly, added `group-focus-within:` modifier in parallel to every existing `group-hover:` modifier:
- inner panel `translate-x-0` (so keyboard Tab opens the panel, not just mouse hover)
- divider rule `w-[calc(100%-44px)]`
- brand label `opacity-100`
- every nav-item label span `opacity-100` (main loop + bottom nav loop)

Result: keyboard-only users get the same expanded-panel UX as mouse hover. New i18n keys `nav.sidebarLandmark` / `nav.primaryNav` (en + zh). New test case `WR-07: a11y landmarks + keyboard focus expansion` verifies the aria attributes and the group-focus-within: classes on every label span.

### WR-08: useStreamingText fires an unconditional initial setChunkIndex on mount

**Files modified:** Same as CR-01 — bundled into commit `4ec9f3c`.
**Applied fix:** The CR-01 hook refactor includes a guard: if `prevSourceRef.current === undefined && source === ""`, the effect establishes the baseline ref without bumping `chunkIndex`. Initial `chunkIndex` of 0 stays at 0 for empty-source mounts (avoids the phantom remount that animated an empty span). Initial non-empty source still counts as the first delta (chunkIndex becomes 1) — that path was correct, just the empty-mount path was the WR-08 bug. Test `initial empty state does not bump chunkIndex` updated to assert `chunkIndex === 0` rather than `>= 1`.

## Skipped Issues

None — all 10 in-scope findings (2 Critical + 8 Warning) were successfully fixed.

The 6 Info findings (IN-01 through IN-06) were intentionally out of scope per `fix_scope: critical_warning`. They are documented in `40-REVIEW.md` for the developer to address as separate quality polish if desired.

---

_Fixed: 2026-05-03T06:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
