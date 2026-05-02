---
phase: 40-shared-component-polish
plan: 02
subsystem: ai-chat
tags: [ai-chat, streaming, sse, claude-style, source-serif-4, font-flow, design-tokens, tdd-triplet]

# Dependency graph
requires:
  - phase: 39-design-token-foundation
    provides: "Phase 39 SSE keyframes (streaming-cursor-blink step-end infinite, streaming-chunk-fadein) + motion tokens (--motion-fast/base/slow, --motion-stream-cursor-period, --ease-claude-out) + typography tokens (font-serif Source Serif 4, text-body utility, text-text-1/text-text-3 colors) + bg-orange brand color"
  - phase: 40-shared-component-polish/plan-01
    provides: "(non-strict) Wave 1 sweep brought Sidebar/DeadlineCard et al to transition-claude-* shorthand; not directly consumed by plan-02 since StreamingAssistant uses Tailwind arbitrary animate-[...] not the transition-claude utilities"
provides:
  - "useStreamingText hook (chunk-arrival metadata adapter for any SSE consumer)"
  - "StreamingAssistant component (no-bubble flowing serif assistant message with inline trailing cursor)"
  - "UserMessage component (right-aligned orange bubble preserving v2.0 visual contract)"
  - "Atomic SHARED-02 visual contract: assistant flows in serif, user keeps brand orange bubble"
  - "Phase 41 + Phase 42 NEWVIS chat surfaces can compose StreamingAssistant + UserMessage"
affects: [phase-40-plan-03 (SHARED-03 Sidebar — independent, parallel-safe per CONTEXT D-40-11), phase-41 (A11Y — aria-hidden cursor pattern lays groundwork for screen-reader audit), phase-42 (NEWVIS — Predict + Digest streaming surfaces will inherit StreamingAssistant pattern when added)]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Adapter hook composing useState + useEffect monotonic chunk counter for keyframe re-trigger via React key prop", "Pure-consumer pattern over Phase 39 design tokens (zero new tokens introduced; all CSS atoms reference existing primitives)", "Atomic role-conditional render replacing dual-role component with internal branching", "TDD triplet: separate RED + GREEN commits per concern (hook + components in two triplets)"]

key-files:
  created:
    - "frontend/hooks/useStreamingText.ts (45 LOC) — adapter hook with monotonic chunkIndex bump on source delta; no use client directive (matches use-ai-stream.ts repo convention)"
    - "frontend/components/shared/StreamingAssistant.tsx (45 LOC) — no-bubble flowing serif assistant message; composes useStreamingText + Phase 39 SSE keyframes; inline trailing cursor mounted only when isStreaming=true"
    - "frontend/components/shared/UserMessage.tsx (20 LOC) — right-aligned orange bubble preserving v2.0 visual contract; bg-orange (Phase 39 token, NOT v2.0 hex bg-[#d97757]); rounded-br-[4px] asymmetric corner"
    - "frontend/__tests__/hooks/useStreamingText.test.ts (50 LOC) — 4 unit tests covering VALIDATION 40-02-01..04 (initial empty / chunkIndex bumps / stream complete / isStreaming false on completion)"
    - "frontend/__tests__/components/shared/StreamingAssistant.test.tsx (35 LOC) — 3 unit tests covering VALIDATION 40-02-05..07 (cursor mounts when streaming / cursor unmounts on completion / Source Serif 4 body class)"
    - "frontend/__tests__/components/shared/UserMessage.test.tsx (20 LOC) — 2 unit tests covering VALIDATION 40-02-08..09 (right-aligned orange bubble / renders text content)"
  modified:
    - "frontend/components/deadlines/DeadlineAiChat.tsx (atomic role-conditional migration; AiChatBubble import → StreamingAssistant + UserMessage)"
    - "frontend/components/course-detail/AiCourseChat.tsx (same atomic migration)"
  deleted:
    - "frontend/components/shared/AiChatBubble.tsx (44 LOC removed; D-40-05 deletion mandate satisfied)"

key-decisions:
  - "D-40-05 honored: 3 new files (useStreamingText hook + StreamingAssistant component + UserMessage component) replace dual-role AiChatBubble.tsx"
  - "D-40-06 honored: Phase 39 SSE keyframes (streaming-cursor-blink step-end infinite, streaming-chunk-fadein) consumed verbatim; zero new tokens introduced"
  - "D-40-07 honored: cursor inline at end of streamed text (terminal-style trailing block); unmounts when isStreaming=false; mounts when streaming with content (also alone if content empty per future placeholder support)"
  - "D-40-12 honored: TDD triplet RED → GREEN → docs preserved; both hook (Tasks 1+2) and components (Tasks 3a+3b) split into atomic RED + GREEN commits per Phase 39 LEARNINGS pattern"
  - "D-40-13 honored: zero new dependencies (no Radix UI, no shadcn primitives, no Tailwind plugin); only consumes existing Phase 39 keyframes + existing useAiStream hook"
  - "INFO-1 atomicity check honored: both DeadlineAiChat + AiCourseChat callers migrated in single Task 4 commit; partial-migration prevention verified by `grep -rEn AiChatBubble components/deadlines/ components/course-detail/` returning 0 matches before Task 5 deletion"
  - "WARNING-1 resolution honored: Task 3 split into 3a (RED) + 3b (GREEN) per checker recommendation, mirroring Tasks 1+2 atomic split for the hook"

patterns-established:
  - "Pattern A: Adapter hook composing existing SSE source — useStreamingText wraps useAiStream output without replacing it; lighter API for downstream consumers that need chunk-arrival metadata"
  - "Pattern B: React key prop on cursor span keyed by monotonic chunkIndex re-mounts the keyframe-bearing span on every chunk arrival, re-triggering streaming-chunk-fadein declaratively (zero imperative DOM)"
  - "Pattern C: Inline style.animation for keyframes that need raw CSS variable references — Tailwind arbitrary animate-[...] handles fadein, but cursor-blink uses inline style for step-end infinite literal (avoids Tailwind keyframe sandbox edge cases)"
  - "Pattern D: Role-conditional render replacing dual-role component — caller decides which sub-component to render based on data shape, eliminating internal isXxx branching from the leaf component"

requirements-completed: [SHARED-02]

# Metrics
duration: ~7min
completed: 2026-05-02
---

# Phase 40 Plan 02: SHARED-02 AI No-Bubble Claude-Style Reply Pattern Summary

**`useStreamingText` hook + `StreamingAssistant` (no-bubble flowing serif text + inline trailing cursor) + `UserMessage` (right-aligned orange bubble preserved) replace the dual-role `AiChatBubble.tsx`; both DeadlineAiChat + AiCourseChat callers atomically migrate to role-conditional render per D-40-05/06/07; SHARED-02 visual contract (assistant continuous narrative, user discrete brand bubble) shipped to v3.0 milestone.**

## Performance

- **Duration:** ~7 min (6 task commits)
- **Started:** 2026-05-02T07:01:22Z
- **Completed:** 2026-05-02T07:09:12Z
- **Tasks:** 6 (Task 1 RED + Task 2 GREEN + Task 3a RED + Task 3b GREEN + Task 4 migration + Task 5 deletion)
- **Files touched:** 9 (3 new sources + 3 new tests + 2 caller migrations + 1 deletion)
- **LOC delta:** +275 added (new files including tests) − 44 (AiChatBubble.tsx deleted) = +231 net (mostly tests; sources alone are +110 vs −44 = +66)

## Accomplishments

- **Adapter hook layer**: `useStreamingText.ts` (45 LOC) — composes existing `useAiStream` SSE output into chunk-arrival metadata. `useState` + `useEffect` monotonic counter pattern locks per RESEARCH Q3 + D-40-05 Discretion. Re-triggers `streaming-chunk-fadein` keyframe via React `key` prop on cursor span.
- **Visual contract split**: `StreamingAssistant.tsx` (45 LOC, no bubble, left-aligned, Source Serif 4 flowing text via `font-serif text-body` Phase 39 utilities) + `UserMessage.tsx` (20 LOC, right-aligned orange bubble preserved). Phase 39 SSE keyframes consumed verbatim — zero new tokens. v2.0 hex `bg-[#d97757]` migrated to Phase 39 token `bg-orange` in UserMessage.
- **Atomic caller migration**: `DeadlineAiChat.tsx` + `AiCourseChat.tsx` swap `<AiChatBubble role={msg.role} />` for role-conditional `{msg.role === "user" ? <UserMessage /> : <StreamingAssistant />}` in a single commit (Task 4) — partial-migration prevention satisfied (INFO-1 fix).
- **Dual-role component deletion**: `AiChatBubble.tsx` (44 LOC) removed from filesystem after caller migration; pre-deletion grep verified zero remaining references in `components/`, `app/`, `hooks/`, `__tests__/`. Build green post-deletion.
- **TDD triplet preserved (D-40-12)**: hook RED (Task 1) → hook GREEN (Task 2); components RED (Task 3a, per WARNING-1 resolution) → components GREEN (Task 3b). Triplet pattern matches Phase 39 LEARNINGS.
- **Build green**: `pnpm lint --max-warnings 0` + `pnpm typecheck` + `pnpm build` all exit 0; 9/9 plan-02 scoped unit tests pass; First Load JS = **220 kB unchanged** from plan-01 baseline (matches Phase 39 LEARNINGS surprise: Tailwind v4 dedupes globally, runtime additions are tree-shaken to ~0).

## Task Commits

Each task was committed atomically per the D-40-12 TDD triplet pattern:

1. **Task 1 RED — useStreamingText failing tests** — `4e4221e` (test)
2. **Task 2 GREEN — useStreamingText implementation** — `f449c44` (feat)
3. **Task 3a RED — StreamingAssistant + UserMessage failing tests** — `1728681` (test)
4. **Task 3b GREEN — StreamingAssistant + UserMessage implementation** — `ec475b8` (feat)
5. **Task 4 — DeadlineAiChat + AiCourseChat caller migration** — `b8b5bfb` (refactor)
6. **Task 5 — AiChatBubble.tsx deletion** — `dd0db95` (refactor)
7. **Task 6 — Docs commit (this SUMMARY.md, in worktree mode)** — pending docs commit on worktree return

_Note: TDD triplet stages preserved per D-40-12: Tasks 1+2 form RED→GREEN for the hook; Tasks 3a+3b form RED→GREEN for the components; Tasks 4+5 are mechanical refactor (caller swap + deletion) which are not TDD candidates per `<tdd_mode_active>` heuristic; Task 6 closes the triplet with the docs commit._

## Files Created/Modified

### Created (3 sources + 3 tests)
- `frontend/hooks/useStreamingText.ts` — Adapter hook with `useState` + `useEffect` chunkIndex monotonic bump; no `"use client"` directive (repo hook convention)
- `frontend/components/shared/StreamingAssistant.tsx` — Assistant message (no bubble, left-aligned, Source Serif 4 flow, inline trailing cursor with `aria-hidden` decorative semantic)
- `frontend/components/shared/UserMessage.tsx` — User message (right-aligned orange bubble, asymmetric corner, Phase 39 `bg-orange` token)
- `frontend/__tests__/hooks/useStreamingText.test.ts` — 4 unit tests (40-02-01..04)
- `frontend/__tests__/components/shared/StreamingAssistant.test.tsx` — 3 unit tests (40-02-05..07)
- `frontend/__tests__/components/shared/UserMessage.test.tsx` — 2 unit tests (40-02-08..09)

### Modified (2 caller migrations)
- `frontend/components/deadlines/DeadlineAiChat.tsx` — Atomic role-conditional migration; `AiChatBubble` import removed; `StreamingAssistant` + `UserMessage` imports added; JSX swap preserves Sources panel rendering for latest assistant answer
- `frontend/components/course-detail/AiCourseChat.tsx` — Same atomic migration as DeadlineAiChat

### Deleted (1 file)
- `frontend/components/shared/AiChatBubble.tsx` — 44 LOC dual-role component removed; D-40-05 deletion mandate satisfied

## Validation Status

| Task ID | Test Type | Command | Status |
|---------|-----------|---------|--------|
| 40-02-01 | unit | `pnpm test -t "initial empty state"` | ✅ green |
| 40-02-02 | unit | `pnpm test -t "chunkIndex bumps"` | ✅ green |
| 40-02-03 | unit | `pnpm test -t "stream complete"` | ✅ green |
| 40-02-04 | unit | `pnpm test -t "isStreaming false on completion"` | ✅ green |
| 40-02-05 | unit | `pnpm test -t "cursor mounts when streaming"` | ✅ green |
| 40-02-06 | unit | `pnpm test -t "cursor unmounts on completion"` | ✅ green |
| 40-02-07 | unit | `pnpm test -t "Source Serif 4 body class"` | ✅ green |
| 40-02-08 | unit | `pnpm test -t "right-aligned orange bubble"` | ✅ green |
| 40-02-09 | unit | `pnpm test -t "renders text content"` | ✅ green |
| 40-02-10 | grep | `! test -f components/shared/AiChatBubble.tsx` | ✅ green |
| 40-02-11 | grep | `! grep -rEn "AiChatBubble" components/ app/ hooks/ __tests__/` → 0 matches | ✅ green |
| 40-02-12 | integration | `pnpm typecheck && pnpm build` | ✅ green |

**Total plan-02 scoped tests: 9/9 passing** (4 useStreamingText + 3 StreamingAssistant + 2 UserMessage)

## Decisions Honored

- **D-40-05** ✅ 3 new files (useStreamingText + StreamingAssistant + UserMessage) replace AiChatBubble.tsx
- **D-40-06** ✅ Phase 39 SSE keyframes (`streaming-cursor-blink` step-end infinite, `streaming-chunk-fadein`) consumed verbatim; zero new tokens
- **D-40-07** ✅ Cursor inline at end of streamed text; unmounts when `isStreaming === false`
- **D-40-12** ✅ TDD triplet RED → GREEN → docs preserved (hook split: Tasks 1 RED + 2 GREEN; components split: Tasks 3a RED + 3b GREEN per WARNING-1 resolution)
- **D-40-13** ✅ Zero new dependencies introduced

## Decisions Diverged

None. All decisions in CONTEXT applicable to plan-02 honored verbatim.

## Checker Resolution

- **WARNING-1 (Task 3 was monolithic RED+GREEN)** ✅ Resolved by splitting Task 3 into 3a (RED test commit) + 3b (GREEN implementation commit) — mirrors Tasks 1+2 atomic split for the hook and honors D-40-12 strict TDD triplet pattern from Phase 39 LEARNINGS.
- **INFO-1 (atomicity check for caller migration)** ✅ Resolved via Task 4 acceptance criteria adding `grep -rEn "AiChatBubble" components/deadlines/ components/course-detail/` returning 0 matches BEFORE Task 5 deletion proceeds — partial-migration prevention.

## Pattern References Used

- **RESEARCH Pattern 3** (useStreamingText hook with `useState` + `useEffect` chunkIndex bump — RESEARCH lines 524–576 copied verbatim)
- **RESEARCH Pattern 4** (StreamingAssistant.tsx + UserMessage.tsx implementations + caller migration template — RESEARCH lines 624–735)
- **RESEARCH Pattern 9** (Vitest TDD RED test scaffold for useStreamingText — RESEARCH lines 1100–1148)
- **PATTERNS Excerpt F** (AiChatBubble splitting plan with role-by-role mutation table)
- **PATTERNS Excerpt G** (use-ai-stream.ts as analog for useStreamingText hook contract)
- **PATTERNS Excerpt H** (use-ai-stream.test.ts as analog for renderHook + initialProps + rerender pattern)
- **PATTERNS Excerpt I** (RoughCard.test.tsx + LoginForm.test.tsx as analogs for component DOM assertion + mock idiom)
- **PATTERNS Excerpt M** (caller migration shared scaffold for DeadlineAiChat + AiCourseChat)
- **PATTERNS Excerpt N** (2-caller verified grep — confirms no Predict/Digest consumers exist today)
- **Phase 39 LEARNINGS** (TDD triplet RED → GREEN → docs commit pattern; SSE keyframe `step-end infinite` NEVER `alternate` lesson; "First Load JS unchanged after className changes" surprise)

## Build Stats

- **First Load JS shared by all:** 220 kB (unchanged from plan-01 baseline of 220 kB)
- **Largest chunk:** `chunks/2808-49dbfdb674cbfd55.js` 124 kB (matches plan-01 size; hash drift expected from new component code)
- **Phase 39 LEARNINGS surprise CONFIRMED**: 3 new components + 1 new hook + 6 caller-import edits net **ZERO measurable bundle delta**. Tailwind v4 dedupes class strings globally; the new Tailwind arbitrary `animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]` collapses to a single keyframe + utility emission shared with any future consumer. New TypeScript code is tree-shaken into the existing chat chunk.

## Visual Verification (deferred to UAT)

Visual outcome (assistant text flows in Source Serif 4 without bubble; user replies render right-aligned in orange bubble; inline cursor blinks at end of latest assistant text while `isStreaming` and unmounts when stream completes) cannot be unit-tested at the pixel level. Will be verified post-deploy on Vercel preview by the user via the existing `MANUAL-40-03` checkpoint in `40-VALIDATION.md` ("AI no-bubble flowing reply visual feel — assistant continuous narrative, user discrete bubble") when phase 40 reaches `/gsd-verify-work 40`.

## Open Questions / Followups

None. Plan-02 closes cleanly:
- Plan-03 (SHARED-03 Sidebar two-layer DOM) is unblocked (parallel-safe per CONTEXT D-40-11; touches disjoint files: `components/layout/Sidebar.tsx` + new `__tests__/components/layout/Sidebar.test.tsx` + new `tests/e2e/perf/phase40-sidebar-60fps.spec.ts`).
- Predict + Digest streaming surfaces (no current callers per RESEARCH Finding 1) deferred to Phase 42 NEWVIS — when added, they consume `StreamingAssistant` directly (forward-compatible).
- `useStreamingText` migration to React Server Components + Suspense deferred to v4.x (per CONTEXT Deferred Ideas).

## Threat Model Status

All 6 STRIDE threats from the plan's `<threat_model>` register satisfied:
- **T-40-02-01 (Tampering / XSS)** ✅ mitigated — All text rendered via React `{text}` text-node interpolation; zero `innerHTML` writes; zero `eval`. VALIDATION 40-02-01 + 40-02-09 codify this guard. Inherits AiChatBubble's pre-existing posture.
- **T-40-02-02 (Information Disclosure / ARIA)** ✅ accepted — `aria-hidden` on cursor span correctly hides decorative element from screen readers.
- **T-40-02-03 (DoS / setState burst)** ✅ accepted — React batches synchronous setState calls within a render cycle; chunkIndex bump O(1) per chunk.
- **T-40-02-04 (Repudiation / commit audit)** ✅ accepted — Conventional Commits + RED-before-GREEN audit trail preserved.
- **T-40-02-05 (Spoofing / import integrity)** ✅ mitigated — Static `import` paths; TypeScript verifies all targets; build catches typos.
- **T-40-02-06 (Elevation of Privilege / new deps)** ✅ mitigated — D-40-13 honored; zero new npm dependencies introduced.

---

## Self-Check: PASSED

- ✅ `frontend/hooks/useStreamingText.ts` exists
- ✅ `frontend/components/shared/StreamingAssistant.tsx` exists (with `step-end infinite`, `aria-hidden`, `font-serif`, `text-body`, `bg-text-3`, `key={chunkIndex}`)
- ✅ `frontend/components/shared/UserMessage.tsx` exists (with `bg-orange`, `text-white`, `rounded-br-[4px]`, `justify-end`)
- ✅ `frontend/__tests__/hooks/useStreamingText.test.ts` exists (4 it blocks)
- ✅ `frontend/__tests__/components/shared/StreamingAssistant.test.tsx` exists (3 it blocks)
- ✅ `frontend/__tests__/components/shared/UserMessage.test.tsx` exists (2 it blocks)
- ✅ `frontend/components/shared/AiChatBubble.tsx` does NOT exist
- ✅ commit `4e4221e` exists (Task 1 RED — useStreamingText test)
- ✅ commit `f449c44` exists (Task 2 GREEN — useStreamingText impl)
- ✅ commit `1728681` exists (Task 3a RED — StreamingAssistant + UserMessage tests)
- ✅ commit `ec475b8` exists (Task 3b GREEN — StreamingAssistant + UserMessage impls)
- ✅ commit `b8b5bfb` exists (Task 4 — caller migration)
- ✅ commit `dd0db95` exists (Task 5 — AiChatBubble deletion)
- ✅ pnpm lint --max-warnings 0 exits 0
- ✅ pnpm typecheck exits 0
- ✅ pnpm test --run __tests__/hooks/useStreamingText.test.ts __tests__/components/shared/ → 9/9 plan-02 scoped tests pass
- ✅ pnpm build exits 0; First Load JS = 220 kB (unchanged from plan-01)
- ✅ All comments in source files (useStreamingText.ts, StreamingAssistant.tsx, UserMessage.tsx, all 3 test files) are English-only per project CLAUDE.md
- ✅ Phase 39 SSE keyframes consumed verbatim (streaming-cursor-blink step-end infinite — NEVER alternate per Phase 39 LEARNINGS)
- ✅ AiChatBubble references in source tree: 0 (verified by grep)
