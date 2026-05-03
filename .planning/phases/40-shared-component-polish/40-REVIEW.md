---
phase: 40-shared-component-polish
reviewed: 2026-05-02T08:30:00Z
depth: standard
files_reviewed: 54
files_reviewed_list:
  - frontend/__tests__/components/layout/Sidebar.test.tsx
  - frontend/__tests__/components/shared/StreamingAssistant.test.tsx
  - frontend/__tests__/components/shared/UserMessage.test.tsx
  - frontend/__tests__/components/ui/Button.test.tsx
  - frontend/__tests__/components/ui/Input.test.tsx
  - frontend/__tests__/eslint/no-raw-transition.test.ts
  - frontend/__tests__/hooks/useStreamingText.test.ts
  - frontend/app/globals.css
  - frontend/components/auth/LanguageSwitcher.tsx
  - frontend/components/auth/LoginForm.tsx
  - frontend/components/auth/PasswordStrengthMeter.tsx
  - frontend/components/auth/RegisterForm.tsx
  - frontend/components/course-detail/AiCourseChat.tsx
  - frontend/components/course-detail/AssessmentRow.tsx
  - frontend/components/course-detail/MaterialItem.tsx
  - frontend/components/dashboard/CourseGradesTable.tsx
  - frontend/components/dashboard/DeadlineTimeline.tsx
  - frontend/components/dashboard/MiniCalendar.tsx
  - frontend/components/dashboard/RecentActivity.tsx
  - frontend/components/deadlines/DeadlineAiChat.tsx
  - frontend/components/deadlines/DeadlineCard.tsx
  - frontend/components/deadlines/DeadlineTitleRow.tsx
  - frontend/components/digest/DigestFilterBar.tsx
  - frontend/components/digest/DigestPage.tsx
  - frontend/components/digest/DigestTitleRow.tsx
  - frontend/components/layout/Header.tsx
  - frontend/components/layout/NotificationPanel.tsx
  - frontend/components/layout/Sidebar.tsx
  - frontend/components/predict/PredictAssessmentTable.tsx
  - frontend/components/settings/DangerZoneSection.tsx
  - frontend/components/settings/GpaTargetSection.tsx
  - frontend/components/settings/LanguageSection.tsx
  - frontend/components/settings/NotificationsSection.tsx
  - frontend/components/settings/ProfileSection.tsx
  - frontend/components/settings/SettingsNav.tsx
  - frontend/components/settings/SettingsQuickActions.tsx
  - frontend/components/settings/TokensSection.tsx
  - frontend/components/setup/StepIndicator.tsx
  - frontend/components/setup/SuccessStep.tsx
  - frontend/components/setup/TokenInput.tsx
  - frontend/components/setup/TokenStep.tsx
  - frontend/components/setup/TutorialStep.tsx
  - frontend/components/setup/WelcomeStep.tsx
  - frontend/components/shared/FeedbackButton.tsx
  - frontend/components/shared/StreamingAssistant.tsx
  - frontend/components/shared/UserMessage.tsx
  - frontend/components/timetable/TimetablePage.tsx
  - frontend/components/timetable/TimetableTitleRow.tsx
  - frontend/components/ui/Button.tsx
  - frontend/components/ui/Input.tsx
  - frontend/eslint.config.mjs
  - frontend/hooks/useStreamingText.ts
  - frontend/package.json
  - frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts
findings:
  critical: 2
  warning: 8
  info: 6
  total: 16
status: issues_found
---

# Phase 40: Code Review Report

**Reviewed:** 2026-05-02T08:30:00Z
**Depth:** standard
**Files Reviewed:** 54
**Status:** issues_found

## Summary

Phase 40 delivers three new design surfaces: cva-based Button/Input primitives, an SSE streaming assistant pair (`useStreamingText` + `StreamingAssistant` + `UserMessage`), and a Sidebar two-layer DOM rewrite for Intel Mac perf. The primitive layer (Button/Input) is well-structured and test-covered. The Sidebar transform-based architecture correctly addresses the prior layout-thrash issue.

However, two BLOCKER-class defects ship in the streaming UX and the Sidebar active-state visual contract:

1. **`StreamingAssistant`'s chunk-key approach causes the entire accumulated text to re-fade-in opacity 0→1 on every SSE chunk arrival** (200+ remounts during a typical AI reply). This produces visible whole-text flicker, the opposite of the intended "smooth typewriter" effect.
2. **The Sidebar active-link highlight silently lost ~40% color saturation** — the Phase 40 sweep replaced `bg-[rgba(217,119,87,.18)]` with `bg-orange-soft` (which the @theme defines as `0.11` opacity). Tests assert class presence but not opacity value, so this regression slipped through codebase-checkable verification.

Eight WARNINGs cover: a real regex/null-safety bug in `DeadlineTimeline`'s rAF cleanup, double mutate on disconnect dialog with no guard, stale `prefs` closure risk in `NotificationsSection`, redundant style/className conflict in `SettingsNav`, race in `Header` outside-click handler, dead `--animate-streaming-*` theme tokens, missing accessibility attributes on Sidebar, and confusing semantics around `chunkIndex` initial bump.

Six INFOs cover style/maintenance items including a never-defined `bg-cream-2` token referenced from auth components.

## Critical Issues

### CR-01: StreamingAssistant re-fades the entire accumulated text on every SSE chunk

**File:** `frontend/components/shared/StreamingAssistant.tsx:24-33`
**Issue:** The text span is keyed by the monotonic `chunkIndex`, and `text` is the FULL accumulated message (the source from `useStreamingText` is `useAiStream`'s last assistant message — the cumulative content, not the per-chunk delta). React unmounts and remounts the span on every chunk arrival. The `streaming-chunk-fadein` keyframe (`opacity: 0 → 1`, `translateY(2px) → 0`, 150ms) replays across the FULL text every single time. For a 200-token reply this is 200 full-text remounts, producing visible flicker, NOT the intended Anthropic-style "new chunk fades in at the cursor" effect.

The PLAN/RESEARCH artifacts refer to this as "re-trigger fadein per chunk arrival declaratively (zero imperative DOM)" — the design intent is correct, but the implementation animates the wrong DOM scope. The keyframe needs to apply only to the newly arrived characters, which requires either (a) splitting `text` into a static prefix + an animated suffix (e.g. `previousText` vs `newDelta`), or (b) keying a smaller wrapper that contains only the latest delta.

Note: jsdom does not run CSS keyframes, so `__tests__/components/shared/StreamingAssistant.test.tsx` cannot detect this — its assertions are scoped to "cursor mounts/unmounts" and "font-serif text-body class present", neither of which observe the fade-in behavior.

**Fix:** Track the prior `text` value in `useStreamingText`, expose `prefixText` (stable) and `deltaText` (the newly arrived suffix), and key only the delta wrapper. Sketch:

```typescript
// frontend/hooks/useStreamingText.ts
export function useStreamingText({ source, isStreaming }: UseStreamingTextOptions) {
  const prevSourceRef = useRef("");
  const [chunkIndex, setChunkIndex] = useState(0);

  // Compute prefix + delta against the prior source (synchronous, render-time).
  const prefix = source.startsWith(prevSourceRef.current) ? prevSourceRef.current : "";
  const delta = source.slice(prefix.length);

  useEffect(() => {
    if (source !== prevSourceRef.current) {
      prevSourceRef.current = source;
      setChunkIndex((i) => i + 1);
    }
  }, [source]);

  return { prefix, delta, isStreaming, chunkIndex };
}
```

```tsx
// frontend/components/shared/StreamingAssistant.tsx
const { prefix, delta, chunkIndex } = useStreamingText({ source: content, isStreaming });
// ...
<span>{prefix}</span>
<span
  key={chunkIndex}
  className="animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]"
>
  {delta}
</span>
```

Alternative: drop the per-chunk keyframe entirely and let the cursor-blink alone signal liveness (matches assistant-ui's claude.tsx reference more faithfully — its example does not animate per-chunk).

### CR-02: Sidebar active-state highlight quietly lost ~40% color saturation

**File:** `frontend/components/layout/Sidebar.tsx:106, 134`
**Issue:** Pre-Phase-40 active class was `bg-[rgba(217,119,87,.18)]` (opacity `0.18`). The Phase 40 sweep replaced it with the design-token utility `bg-orange-soft`, but `--color-orange-soft` is defined in `globals.css` line 15 as `oklch(0.6724 0.1308 38.76 / 0.11)` (and the fallback line 271 as `rgba(217, 119, 87, 0.11)`). That is opacity `0.11`, not `0.18`.

Result: the active nav item highlight is now ~39% less saturated than the v2.0 baseline — a visible regression. Both the main nav loop (line 106) and the bottom nav loop (line 134) carry the same change. The `__tests__/components/layout/Sidebar.test.tsx` asserts the className contains `bg-orange-soft` (passing), but never verifies the opacity matches what the v2.0 design intended.

This is the same drift family flagged in repo memory `project_backdrop_filter_intel_mac.md` — "user notices subtle color drift that pixel-diff-or-the-user-catches-it visually."

**Fix:** Either (a) restore the literal opacity by introducing a stronger active-state token, or (b) keep `bg-orange-soft` but raise its opacity in `@theme` to `0.18` (will affect every other `bg-orange-soft` consumer — verify Header `focus-within:shadow-[0_0_0_3px_var(--color-orange-soft)]` and others still look right):

```tsx
// Option A — preserve the v2.0 saturation explicitly:
active
  ? "bg-[rgba(217,119,87,.18)] text-orange"
  : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
```

```css
/* Option B — bump --color-orange-soft to 0.18 in globals.css @theme block:
   This changes opacity for EVERY caller of bg-orange-soft / focus rings — test
   Header search/notif buttons, NotificationPanel unread row, etc. */
--color-orange-soft: oklch(0.6724 0.1308 38.76 / 0.18);
```

Option A is the lower-blast-radius fix; recommended.

## Warnings

### WR-01: `cancelAnimationFrame(innerRafId)` may be called before innerRafId is assigned

**File:** `frontend/components/dashboard/DeadlineTimeline.tsx:119-131`
**Issue:** The cleanup function runs whenever the effect re-runs OR on unmount. If the component re-renders (e.g. `deadlines` prop changes) BEFORE the outer rAF callback fires, the cleanup function executes with `innerRafId` still `undefined` (TS allows this because `let innerRafId: number;` has no initializer). `cancelAnimationFrame(undefined)` is per-spec a no-op, but TypeScript with `strict: true` should flag this as `'innerRafId' is used before being assigned`. Either `tsc --noEmit` is permissive here, or the project is missing strictness on this path. Either way, the latent bug surface is real: any code change that swaps in a different cancellation primitive (`clearTimeout`, custom scheduler) will silently misbehave.

**Fix:**

```tsx
useEffect(() => {
  let innerRafId: number | undefined;
  const outerRafId = requestAnimationFrame(() => {
    innerRafId = requestAnimationFrame(() => {
      drawTimeline();
    });
  });

  return () => {
    cancelAnimationFrame(outerRafId);
    if (innerRafId !== undefined) cancelAnimationFrame(innerRafId);
  };
}, [drawTimeline, deadlines]);
```

### WR-02: DangerZoneSection fires two unguarded mutations on disconnect

**File:** `frontend/components/settings/DangerZoneSection.tsx:21-25`
**Issue:** `handleDisconnect` calls `deleteToken.mutate({ platform: "canvas" })` and `deleteToken.mutate({ platform: "ed" })` back-to-back, then immediately closes the dialog. There is no error coalescing, no pending-state UX, and no rollback if Canvas succeeds and Ed fails (or vice-versa). The user gets no feedback whether one or both tokens were actually removed. If `useDeleteToken` invalidates the user query on each success, both invalidations fire and may race. Additionally, the dialog closes synchronously regardless of mutation outcome — if the network is slow, the user may proceed to other settings without knowing whether disconnect succeeded.

**Fix:** Either gate close behind both successes via `mutateAsync`, or display a per-platform pending/result state inside the dialog before closing:

```tsx
const handleDisconnect = async () => {
  try {
    await Promise.all([
      deleteToken.mutateAsync({ platform: "canvas" }),
      deleteToken.mutateAsync({ platform: "ed" }),
    ]);
    toast.success(t("danger.disconnect.successAll"));
    disconnectDialogRef.current?.close();
  } catch (err) {
    toast.error(t("danger.disconnect.partialFailure"));
    // Leave dialog open so user can see what happened.
  }
};
```

### WR-03: NotificationsSection.savePrefs uses empty deps but reads stale `prefs` via closure

**File:** `frontend/components/settings/NotificationsSection.tsx:48-64`
**Issue:** `savePrefs` is wrapped in `useCallback(_, [])` (stable identity) and accepts the next prefs object as an argument — that part is correct. But `togglePref(key)` calls `savePrefs({ ...prefs, [key]: !prefs[key] })`, where `prefs` is read from the component closure. Because `togglePref` is a plain function (not memoized), it's recreated on every render, so it does see the latest `prefs` — making this OK in practice.

However, this pattern is fragile: if a future refactor wraps `togglePref` in `useCallback` (or passes it as a prop to a memoized child), it WILL capture stale `prefs` and start dropping toggle updates if the user clicks two switches rapidly within one render frame.

**Fix:** Use functional updates so the handler does not depend on `prefs` closure:

```tsx
const savePrefs = useCallback((updater: (prev: NotificationPrefs) => NotificationPrefs) => {
  setPrefs((prev) => {
    const next = updater(prev);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage full */ }
    return next;
  });
}, []);

function togglePref(key: keyof Omit<NotificationPrefs, "digestFrequency">) {
  savePrefs((prev) => ({ ...prev, [key]: !prev[key] }));
}
```

### WR-04: SettingsNav has redundant border-left utility AND inline style — inline always wins

**File:** `frontend/components/settings/SettingsNav.tsx:50-63`
**Issue:** The button className includes `border-l-2 border-transparent` and `isActive && "...border-l-[#d97757]..."`, while the inline `style` block sets `borderLeftWidth: "2px"`, `borderLeftStyle: "solid"`, `borderLeftColor: isActive ? "#d97757" : "transparent"`. Inline styles override Tailwind utilities, so the className portion controlling left-border is dead code. If a future change tries to tweak the active border via the className (e.g. `border-l-orange`), the inline style will silently shadow it.

**Fix:** Pick one source of truth. Remove the inline `style` block and rely entirely on Tailwind utilities (cleaner; consistent with other Phase 40 work):

```tsx
<button
  type="button"
  onClick={() => onNavClick(item.id)}
  className={cn(
    "w-full flex items-center gap-[10px] py-[9px] px-[12px] rounded-[8px]",
    "text-[0.82rem] font-medium cursor-pointer transition-claude-fast",
    "border-l-2 bg-transparent",
    "hover:bg-[#efede6] hover:text-[#2d2d2a]",
    isActive
      ? "bg-orange-soft text-orange border-l-orange font-semibold"
      : "text-text-2 border-l-transparent",
  )}
>
```

### WR-05: Header outside-click effect briefly attaches no listener while transitioning between dropdowns

**File:** `frontend/components/layout/Header.tsx:42-55`
**Issue:** The effect early-returns if both `notifOpen` and `avatarOpen` are false. When the user is closing one dropdown by clicking the other trigger button:

1. Bell button click → `setNotifOpen(false)` + `setAvatarOpen(true)` (both batched).
2. Effect re-runs because deps changed. The `[notifOpen, avatarOpen]` change is `[true, false] → [false, true]` — the effect tears down the old listener and attaches a new one inside the same microtask.

This window is short, but more concerning is the toggle pattern using stale captured state: `setNotifOpen(!notifOpen)` reads `notifOpen` from the closure of the prior render. If the user rapid-clicks (e.g. opens NotificationPanel, then immediately clicks the Avatar button before React commits), `setAvatarOpen(false)` (the line in the Bell click handler) might cancel a true→true toggle the user expected. Not a frequent failure, but not provably absent either.

**Fix:** Switch to functional updates so toggles are always derived from the latest committed state:

```tsx
onClick={(e) => {
  e.stopPropagation();
  setNotifOpen((prev) => !prev);
  setAvatarOpen(false);
}}
```

Same change for the Avatar button. Optional: combine into a single ref-driven `useEffect` that reads both refs once and uses event delegation, eliminating the dep-driven re-attach entirely.

### WR-06: `--animate-streaming-cursor-blink` and `--animate-streaming-chunk-fadein` are dead theme tokens

**File:** `frontend/app/globals.css:145-146`
**Issue:** These two `--animate-*` tokens are declared inside `@theme` (Tailwind v4 generates `animate-streaming-cursor-blink` and `animate-streaming-chunk-fadein` utility classes from them), but `StreamingAssistant.tsx` uses an inline `style={{ animation: "streaming-cursor-blink ..." }}` for the cursor and `animate-[streaming-chunk-fadein_...]` arbitrary-value Tailwind utility for the text — neither path goes through these tokens.

If Phase 41 (or anyone else) thinks they can swap timing globally by editing the token definition, the change will not take effect because no consumer references the generated utility class. This is a maintenance trap.

**Fix:** Either (a) remove the two `--animate-*` tokens since nothing consumes them, or (b) refactor `StreamingAssistant.tsx` to use the generated utilities (`className="animate-streaming-cursor-blink"` and `className="animate-streaming-chunk-fadein"`) so the tokens are the single source of truth.

### WR-07: Sidebar lost no a11y annotations but never had them — still a regression risk for the rewrite

**File:** `frontend/components/layout/Sidebar.tsx:59-66`
**Issue:** The rewritten `<aside>` has no `aria-label`, `role="navigation"`, or visually-hidden heading. Screen readers announce it as a generic "complementary" landmark, and the inner nav items collapse into a flat link list with no accessible name for the navigation region itself. This is identical to the pre-Phase-40 state — but the Phase 40 rewrite was the natural moment to add these annotations, especially since the inner panel hides itself off-screen via `translate-x-[-156px]` until hover, which can confuse keyboard-only users (the labels are `opacity-0` until `group-hover` fires; keyboard focus does NOT trigger `group-hover` in CSS, so a Tab-traversing user never sees nav labels).

**Fix:** Add nav semantics + a `focus-within` trigger so keyboard users see expanded labels:

```tsx
<aside
  aria-label={t("sidebarLandmark")}
  className={cn(
    "fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)] z-[100]",
    "overflow-hidden border-r border-[rgba(20,20,19,.08)]",
    "[contain:layout_paint] group focus-within:..."
  )}
>
  <div
    role="navigation"
    aria-label={t("primaryNav")}
    className={cn(
      "absolute inset-y-0 left-0 w-[var(--spacing-sidebar-w-expanded)]",
      "bg-dark flex flex-col py-5",
      "translate-x-[-156px] group-hover:translate-x-0 group-focus-within:translate-x-0",
      "transition-claude-base will-change-transform [contain:layout_paint]"
    )}
  >
```

Also propagate the `group-focus-within:` modifier to the label `opacity-0 group-hover:opacity-100 transition-claude-base` lines (87, 111, 139) so labels appear when a child link receives keyboard focus.

### WR-08: useStreamingText fires an unconditional initial setChunkIndex on mount

**File:** `frontend/hooks/useStreamingText.ts:33-38`
**Issue:** `useEffect(() => setChunkIndex(prev => prev + 1), [source])` runs once on mount even when `source === ""`. The initial `chunkIndex` of `0` is bumped to `1` immediately, which is what the test `chunkIndex starts at 1` (line 13) verifies — but that test is asserting the bug, not the behavior the comment describes. The comment says "Bump chunkIndex on every text delta", but mount with `source === ""` is not a delta.

Practical impact: `StreamingAssistant` mounts the keyframe-bearing span with `key=1` and animates an empty span fading in (invisible because text is empty — but the React commit cost of an immediate re-render is paid). Combined with CR-01, this is one extra phantom remount per StreamingAssistant lifecycle. Code-cosmetic if the keyframe scope is fixed; just confusing in test output.

**Fix:** Skip the initial bump using a ref or direct comparison:

```typescript
export function useStreamingText({ source, isStreaming }) {
  const prevSourceRef = useRef<string | undefined>(undefined);
  const [chunkIndex, setChunkIndex] = useState(0);

  useEffect(() => {
    if (prevSourceRef.current === source) return; // no-op on duplicate or first-render no-op
    if (prevSourceRef.current === undefined && source === "") {
      // Initial mount with no content — don't burn a chunk index.
      prevSourceRef.current = source;
      return;
    }
    prevSourceRef.current = source;
    setChunkIndex((i) => i + 1);
  }, [source]);

  return { text: source, isStreaming, chunkIndex };
}
```

Update the test `chunkIndex starts at 1` to assert `chunkIndex === 0` for the empty-source case.

## Info

### IN-01: `bg-cream-2` token is referenced but not defined anywhere

**File:** `frontend/components/auth/LoginForm.tsx:77`, `frontend/components/auth/RegisterForm.tsx:117`, `frontend/components/auth/UsydBanner.tsx:62`, `frontend/components/dashboard/AssessmentDonut.tsx:291`
**Issue:** `globals.css` defines `--color-cream` but NOT `--color-cream-2`. Tailwind v4 will not generate a `bg-cream-2` utility for an undefined token, so `hover:bg-cream-2` on the Google OAuth button has no visual hover effect (the color silently no-ops). This is preexisting (the diff confirms LoginForm carried `bg-cream-2` before Phase 40), but the file is in the Phase 40 sweep scope — flagging it for a follow-up.
**Fix:** Either add `--color-cream-2` to `@theme` (e.g. `oklch(0.96 0.005 95)`) or replace with `hover:bg-card-bg-hover` which IS defined.

### IN-02: Two leftover `transition: "opacity 0.4s ease"` inline styles

**File:** `frontend/components/dashboard/DeadlineTimeline.tsx:236`, `frontend/components/dashboard/CourseGradesTable.tsx:222`
**Issue:** Hardcoded `transition: "opacity 0.4s ease"` inline-style strings remain on the "see details" / "predict" hover-revealed buttons. These bypass the Phase 39/40 motion token system entirely (`var(--ease-claude-out)` + `var(--motion-slow)` would be the design-system equivalent). The new ESLint rule does NOT catch raw `"opacity 0.4s ease"` strings (the rule only flags Tailwind className regexes), so future cleanup must be manual.
**Fix:** Inline `transition-opacity transition-claude-slow` className on the button instead, or set `style={{ transition: "opacity var(--motion-slow) var(--ease-claude-out)" }}`.

### IN-03: `transition: "transform 0.28s cubic-bezier(.4,0,.2,1)"` hardcoded in GuideCard

**File:** `frontend/components/setup/GuideCard.tsx:68` (out-of-scope file but in same family as IN-02)
**Issue:** Same family as IN-02; flagged for awareness. `cubic-bezier(.4,0,.2,1)` is the legacy `--ease` value (line 138 of globals.css) — this is exactly the kind of new-debt-vs-old-debt that the Phase 40 D-40-04 ESLint rule was intended to discourage, but it does not catch this raw form.
**Fix:** `style={{ transition: "transform var(--motion-base) var(--ease-claude-out)" }}` or className equivalent.

### IN-04: TimetableTitleRow nav buttons use `pointer-events-none` AND `disabled` attribute

**File:** `frontend/components/timetable/TimetableTitleRow.tsx:81-83, 96-98`
**Issue:** Buttons have both `disabled` attribute and `pointer-events-none` className when at week boundaries. Since `disabled` already prevents click events (and removes the button from tab order), `pointer-events-none` is redundant. The combination is harmless but adds maintenance overhead — if someone removes one but not the other, behavior diverges.
**Fix:** Drop `pointer-events-none` from the `cn()` array; rely on the `disabled` attribute alone.

### IN-05: Sidebar `prefetch={true}` on every nav Link is loud at mount

**File:** `frontend/components/layout/Sidebar.tsx:101, 129`
**Issue:** Next 15 will prefetch all 7 nav routes in parallel on Sidebar mount. With i18n locale prefixing, this is 7 × 1 = 7 RSC payload requests immediately on app boot. This is intentional for snappier nav, but it shows up as a wall of prefetch requests in the network tab on slow connections. Consider `prefetch={false}` for the bottom Settings nav (which is rarely the first navigation target).
**Fix:** Lower priority for less-likely targets:

```tsx
{bottomItems.map((item) => (
  <Link href={item.href} prefetch={false} ... />
))}
```

### IN-06: PredictAssessmentTable input regex permissively allows decimals at clamp time

**File:** `frontend/components/predict/PredictAssessmentTable.tsx:37-52`
**Issue:** `handleInputChange` validates with `/^\d+\.?\d*$/` (passes "85", "85.", "85.5") but rejects ".5" (no leading digit) and scientific notation. For values that pass the regex, `parseFloat` then clamps to `[0, 100]`, but the path that preserves trailing-dot input ("85.") returns the raw string while a fully-typed digit "150" clamps to "100". The mixed return semantics mean the parent state can hold either a raw user-typed string ("85.") or a clamp-normalized string ("100"), which is fine but easy to misread when debugging — a comment on the function would help future maintainers.
**Fix:** Either split the function into "validate" and "format" halves, or add a doc-comment clarifying the dual return semantics.

---

_Reviewed: 2026-05-02T08:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
