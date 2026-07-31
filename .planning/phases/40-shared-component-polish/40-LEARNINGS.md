---
phase: 40
phase_name: "shared-component-polish"
project: "UniBoard v3.0"
generated: "2026-05-03T11:48:00Z"
counts:
  decisions: 11
  lessons: 7
  patterns: 11
  surprises: 6
missing_artifacts:
  - "40-UAT.md (not generated — gsd-verify-work was not run before ship; verification routed through gsd-verifier producing VERIFICATION.md instead)"
---

# Phase 40 Learnings: shared-component-polish

## Decisions

### D-40-01 — Extract Button + Input primitives only; defer Modal / Tooltip / Card
Phase 40 SHARED-01 scope narrowed to two primitives even though codebase had 277 raw `<button>` / `<input>` JSX usages.

**Rationale:** Modal had only 2 callers (`DangerZoneSection.tsx`, `ExternalLinkDialog.tsx`) — abstraction not justified. Tooltip had no existing implementation. Card is `RoughCard.tsx` — Rough.js hard constraint. Button + Input captures ~80% of token-routing pain at acceptable blast radius.
**Source:** `40-CONTEXT.md`

### D-40-02 — cva over Radix UI / shadcn full
`class-variance-authority` (~1.5kb, type-safe variant binding) chosen instead of Radix UI primitives or shadcn-style copy-paste components.

**Rationale:** Radix UI dependency unjustified — Modal stays native `<dialog>`; Tooltip not extracted. cva delivers variant-to-token binding without behavior layer. Single transitive dep (`clsx`) already present.
**Source:** `40-CONTEXT.md`, `40-01-SUMMARY.md`

### D-40-03 — Fold SEED-40 motion DRY refactor into Phase 40
SEED-40 (motion utility shorthand) was a separate dormant seed; merged into Plan 01 instead of standalone phase.

**Rationale:** Doing the 277-caller Button/Input sweep + the 56-caller verbose-form sweep in two separate phases would mean two near-identical PRs touching the same files. SEED-40's effort estimate (~1.5h) is small enough to fold here.
**Source:** `40-CONTEXT.md`

### D-40-04 — ESLint-gate legacy `--ease` / `--ease-fast`; do NOT full-sweep
50+ existing `var(--ease)` callers stay; new ESLint rule blocks new occurrences only. Aliases remain in `globals.css`.

**Rationale:** Full sweep adds 50+ file diff with cosmetic 30ms duration shifts (0.28s legacy → 0.25s `--motion-base`) that could surface as imperceptible-but-cumulative visual regression. Phase 39 LEARNINGS chose conservatism (alias retention); Phase 40 honors that for the subsequent layer.
**Source:** `40-CONTEXT.md`

### D-40-05 — Replace AiChatBubble with three new files (hook + assistant + user)
Dual-role component split into `useStreamingText.ts` + `StreamingAssistant.tsx` + `UserMessage.tsx`.

**Rationale:** A `mode` prop on AiChatBubble would couple user-bubble + assistant-flowing into one component with internal branching — not a natural API for "user vs assistant have fundamentally different visual treatment". The double-component split is cleaner long-term.
**Source:** `40-CONTEXT.md`, `40-02-SUMMARY.md`

### D-40-06 — Consume Phase 39 SSE keyframes verbatim
`streaming-cursor-blink` (1s `step-end` infinite — never `alternate`) and `streaming-chunk-fadein` referenced from Phase 39; zero new motion tokens introduced in Phase 40.

**Rationale:** Phase 39 published the primitives; Phase 40 is a pure consumer. Maintains tokens-as-contract architecture.
**Source:** `40-CONTEXT.md`, `40-02-SUMMARY.md`

### D-40-08 — Sidebar Option A literal geometry (translate-x-[-156px] + group-hover:translate-x-0)
Locked in CONTEXT.md; SPIKE artifact at `prototype/sidebar-geometry-spike.html` verified visual outcome before production rewrite.

**Rationale:** Geometry-ambiguous structural rewrite needs visual verification BEFORE the production change. Plan checker BLOCKER-4 forced removal of Option C hybrid from candidate set.
**Source:** `40-CONTEXT.md`, `40-03-SUMMARY.md`

### D-40-09 — Sidebar active highlight rendered inside inner panel only
No bridging element on outer 68px shell; right portion of the orange highlight on the active row is what's visible while collapsed.

**Rationale:** Single source of truth for active state; eliminates synchronization complexity between two layers.
**Source:** `40-CONTEXT.md`, `40-03-SUMMARY.md`

### D-40-12 — TDD triplet: RED → GREEN → docs in separate atomic commits
Phase 39 LEARNINGS pattern preserved across all `type: tdd` plans. Plan 01 Task 1 split into 1a (RED) + 1b (GREEN) per checker BLOCKER-3. Plan 02 hook (Tasks 1+2) and components (Tasks 3a+3b) both split.

**Rationale:** Separate commits document intent (failing test = spec) and verification (passing test = correct implementation). Enables `git bisect` and per-commit review.
**Source:** `40-CONTEXT.md`, all plan SUMMARYs

### D-40-13 — Zero new dependencies beyond cva
No Radix UI, no shadcn primitives, no Tailwind plugin, no animation library. Only `class-variance-authority ^0.7.1` added.

**Rationale:** Bundle weight discipline; Phase 39 token system already provides everything Phase 40 needs visually.
**Source:** `40-CONTEXT.md`, `40-01-SUMMARY.md`

### CR-02 fix — Restore literal `bg-[rgba(217,119,87,.18)]` instead of mutating `--color-orange-soft` token
Sidebar active-highlight color drifted (0.18 → 0.11 opacity) when sweep replaced literal with `bg-orange-soft` token. Fix restored the literal in Sidebar.tsx.

**Rationale:** Lower blast radius. Mutating the token would also affect Header focus rings, NotificationPanel unread row, and other consumers that depend on the 0.11 baseline. Literal local restoration isolates the fix.
**Source:** `40-REVIEW-FIX.md`

---

## Lessons

### Lesson 1 — Worktree `pnpm install` does NOT propagate to main worktree's node_modules
Plan 01 added `class-variance-authority` to package.json + pnpm-lock.yaml inside its isolated worktree. Post-merge, the main worktree's typecheck failed because cva wasn't in `frontend/node_modules`. Required manual `pnpm install` before tests would pass.

**Context:** Worktrees share `.git` but each has its own `node_modules`. When the orchestrator merges back, the lock file changes but actual install hasn't happened in the main tree.
**Source:** post-merge gate failure (Wave 1 → Wave 2 transition); session bash output

### Lesson 2 — `basename` strips `worktree-` prefix; merge / branch-delete with wrong name silently fails
Worktree merge-back script used `basename "$WT"` which returned `agent-XXXX` rather than the actual branch name `worktree-agent-XXXX`. `git merge agent-XXXX` and `git branch -D agent-XXXX` both errored quietly, looking like cleanup succeeded — but commits became orphaned.

**Context:** Recoverable via reflog if not GC'd. Always use `git -C "$WT" rev-parse --abbrev-ref HEAD` to get the correct branch name from the worktree itself.
**Source:** Wave 2 merge bug; recovered via `git branch worktree-agent-XXXX <SHA>`

### Lesson 3 — Per-commit cherry-pick PR-branch fails when source branch has commits already squash-merged into main
The local `chore/milestone-v3.0-init` branch contained 75 commits including Phase 39 work that had been squash-merged into main as PR #127. Cherry-picking those commits onto the new PR branch (based on `origin/main`) re-applies content that already exists in c86b07f, causing 42/53 conflicts.

**Context:** Snapshot strategy (branch from origin/main, copy source-branch tracked files in one commit) bypasses this. Better suited for milestones with prior squash-merged phases.
**Source:** `/gsd-pr-branch main` failure; recovered with snapshot approach

### Lesson 4 — Code reviewer catches BLOCKERS that 37/37 unit tests miss
CR-01 (StreamingAssistant per-chunk full-text refade flicker) and CR-02 (Sidebar active highlight color drift from 0.18 → 0.11) both shipped as Critical findings in code review despite all unit tests passing.

**Context:** jsdom doesn't run CSS keyframes (CR-01 visual flicker invisible). Tests assert className strings as-written, not resolved CSS values (CR-02 color drift invisible). Visual bugs need visual review — `/gsd-code-review` after `/gsd-execute-phase` is non-negotiable for UI work.
**Source:** `40-REVIEW.md` CR-01, CR-02

### Lesson 5 — Pre-existing test failures must be ruled out via baseline checkout, not assumed
23 `useLocale needs IntlProvider` failures across 5 test files surfaced post-Plan 01 sweep. The fixer agent confirmed they were pre-existing by `git stash` round-trip + checkout to baseline `ea2dbc4` and re-running the same 5 test files (identical 23 fail / 3 pass count).

**Context:** Without this verification, the 23 failures could be misclassified as Phase 40 regressions and block the ship. Documented as DEFERRED-40-01 for Phase 41 a11y kickoff.
**Source:** `40-REVIEW-FIX.md` "Gate state after fixes" section, `deferred-items.md`

### Lesson 6 — `gsd-code-review` SUMMARY.md frontmatter parser misclassifies nested YAML list items as file paths
The Node parser in `code-review.md` walks `key_files.created` and `key_files.modified` arrays but its regex `/^\s+-\s+(.+)/` matches ANY indented list item — so `key-decisions:`, `patterns-established:`, `BLOCKER-N resolution:` items got pulled in as if they were file paths.

**Context:** Forced fallback to git-diff scoping for the `/gsd-code-review` invocation. Filter-existing-files step naturally drops the noise but signals a parser hardening opportunity in upstream GSD.
**Source:** Code-review file scope inspection during `/gsd-code-review 40`

### Lesson 7 — Mechanical sed sweeps need separate fixture-update commits
Phase 39's ESLint negative-control fixture (`/* legal */ const ok = "transition-...";`) was migrated by Plan 01's sed sweep — but the test expected the OLD form. Required a follow-up fixture update so the test's "rule does NOT false-flag legal post-migration utility" semantic was preserved.

**Context:** Mechanical sweeps don't know about test fixture intent. Always re-run the test suite immediately after a sweep, fix any fixtures that move semantically (not just syntactically).
**Source:** `40-01-SUMMARY.md` "Phase 39 ESLint test fixture updated" decision

---

## Patterns

### Pattern 1 — cva primitive scaffold
`forwardRef<HTMLElement, ComponentProps & VariantProps<typeof variants>>` + cva variants block (variants × sizes + boolean modifiers + defaultVariants) + named export of `variants` builder for downstream composition.

**When to use:** Any new UI primitive with 2+ visual variants and design-token-bound styles. Phase 41/42 should reuse this scaffold for Tooltip / Dialog / Select if extracted.
**Source:** `frontend/components/ui/Button.tsx`, `frontend/components/ui/Input.tsx`, `40-01-SUMMARY.md` Pattern 1

### Pattern 2 — Tailwind v4 `@utility` shorthand placement
`@utility transition-claude-fast { transition-property: all; transition-duration: var(--motion-fast); transition-timing-function: var(--ease-claude-out); }` placed top-level in `globals.css` AFTER `@theme` block. NOT nested inside `@theme` (silently no-ops).

**When to use:** Any time you have 3+ verbose arbitrary-property className triples repeated across the codebase. Sweep with sed; gate forward debt with ESLint `no-restricted-syntax`.
**Source:** `frontend/app/globals.css`, `40-01-SUMMARY.md` Pattern 2

### Pattern 3 — ESLint self-override for forbidden-substring regex sources
When `no-restricted-syntax` selectors contain the forbidden literal as part of the regex, the rule trips on its own config file. Add `{ files: ["eslint.config.mjs"], rules: { "no-restricted-syntax": "off" } }` exception.

**When to use:** Any ESLint rule whose own selector source contains the substring it forbids.
**Source:** `frontend/eslint.config.mjs`, `40-01-SUMMARY.md` Pattern 3

### Pattern 4 — BSD sed playbook for grep-stable mechanical className sweeps
6 passes covering all combinations: `(transition-all|transition-colors)` × `(--motion-fast|--motion-base|--motion-slow)`. Each pass is `sed -i '' -E 's/old-pattern/new-utility/g'` on the file list from `grep -rln`.

**When to use:** Mechanical className substitutions across 30+ files where regex stability matters (no negative matches).
**Source:** `40-01-SUMMARY.md` Pattern 4

### Pattern A — Adapter hook composing existing SSE source
`useStreamingText` wraps `useAiStream` output with prefix/delta/chunkIndex metadata; doesn't replace the SSE primitive. Lighter API for downstream consumers needing chunk-arrival keyframe re-trigger.

**When to use:** Any time a downstream component needs metadata about an existing hook's output without forking the source. `useFooMetadata` over `useFooReplacement`.
**Source:** `frontend/hooks/useStreamingText.ts`, `40-02-SUMMARY.md` Pattern A

### Pattern B — Prefix + delta split for SSE animation (CR-01 bug fix pattern)
Split source string into stable `prefix` (rendered without animation) + most-recent `delta` (rendered with chunk-fadein keyframe and keyed by chunkIndex). `<span>{prefix}<span key={chunkIndex}>{delta}</span><cursor/></span>`.

**When to use:** Streaming text UIs where keyframe-bearing element should NOT re-mount on every chunk (full-text refade flicker). Hold the split in state, not derived, so unrelated re-renders don't recompute it.
**Source:** `frontend/hooks/useStreamingText.ts` (post-CR-01 fix), `40-REVIEW-FIX.md` CR-01

### Pattern C — Inline `style.animation` for raw CSS-variable-bearing keyframes
Tailwind arbitrary `animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)]` works for fadein, but `streaming-cursor-blink` uses inline `style={{ animation: "streaming-cursor-blink 1s step-end infinite" }}`. Avoids Tailwind keyframe sandbox edge cases for `step-end` literal.

**When to use:** When a keyframe needs `step-end` / `alternate` / other timing literals that Tailwind's arbitrary-value parser can't reliably express.
**Source:** `frontend/components/shared/StreamingAssistant.tsx`, `40-02-SUMMARY.md` Pattern C

### Pattern D — Two-layer DOM for hover-expand surfaces
Outer fixed-width layout occupier (`fixed inset-y-0 left-0 w-[68px] [contain:layout_paint]` + 1px right border) + inner absolute-positioned translate-animated panel (`w-[224px] translate-x-[-156px] group-hover:translate-x-0 [contain:layout_paint] will-change-transform`).

**When to use:** Any hover-expand surface where outer-tree main content padding-left must remain stable across hover/collapse cycles. Eliminates layout-thrashing on Intel Mac compositor.
**Source:** `frontend/components/layout/Sidebar.tsx`, `40-03-SUMMARY.md` Pattern 1

### Pattern E — Static HTML SPIKE artifact for geometry-ambiguous structural rewrites
`prototype/<slug>-spike.html` renders the locked option side-by-side with a discarded alternate. Verifies visual outcome of CONTEXT decisions BEFORE production rewrite. Documented escalation policy if visual parity is violated.

**When to use:** Sidebar-like geometry rewrites, table layout changes, animation-driven layouts where mockup-quality verification is faster than implementation-quality verification.
**Source:** `prototype/sidebar-geometry-spike.html`, `40-03-SUMMARY.md` Pattern 2

### Pattern F — Env-gated Playwright spec stub for deferrable visual/perf baselines
Author spec in-tree, gate via `shouldRunPerfSuite()` helper that checks `PERF_TEST_PASSWORD` env var. Defer baseline generation to user-runnable closure procedure with credentials provisioned. Phase 39 SEED-39 carry-forward pattern.

**When to use:** Performance/visual baselines that require specific hardware (Intel Mac), credentialed environments (production data), or human visual judgment but should still live in CI for regression detection once baseline lands.
**Source:** `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts`, `40-03-SUMMARY.md` Pattern 3

### Pattern G — Functional updater for closure-stale toggles (WR-03/WR-05 fix pattern)
`setX((prev) => !prev)` over `setX(!x)`. `setPrefs((prev) => ({ ...prev, foo: bar }))` over `setPrefs({ ...prefs, foo: bar })`. Eliminates closure dependency on stale state in async toggles + memoized handlers.

**When to use:** Any setState call inside a handler that might be memoized via `useCallback` or might fire from async event listeners (rapid clicks, debounced effects, websocket handlers).
**Source:** `frontend/components/layout/Header.tsx`, `frontend/components/settings/NotificationsSection.tsx`, `40-REVIEW-FIX.md` WR-03/WR-05

---

## Surprises

### Surprise 1 — First Load JS = 220 KB unchanged across all 3 plans
Phase 39's bundle-stability surprise replicated. 56 className changes (Plan 01 sweep) + 3 new component files (Plan 02) + Sidebar full rewrite (Plan 03) net **zero bundle delta**.

**Impact:** Tailwind v4 dedupes class atoms globally; runtime additions are tree-shaken to ~0. Future polish phases can be confident the bundle ceiling won't move just because new design tokens / shorthands land. Removes a class of "did this PR cost bytes" review questions.
**Source:** `40-01-SUMMARY.md` "Build Stats", `40-02-SUMMARY.md` "Build green", `40-03-SUMMARY.md` "Build green"

### Surprise 2 — Per-commit cherry-pick PR-branch strategy fails when prior phase squash-merged into main
`/gsd-pr-branch main` workflow assumed clean linear history; here the source branch held un-squashed Phase 39 commits that conflicted with c86b07f (PR #127 squash). 42/53 cherry-picks failed with merge conflicts.

**Impact:** Forced fallback to snapshot strategy (single squash commit on PR branch). Future milestones with mid-development squash-merges should default to snapshot-style PR branches, not per-commit cherry-pick. GSD workflow could detect this scenario.
**Source:** Session bash output during `/gsd-pr-branch main`

### Surprise 3 — Worktree merge-back via wrong branch name fails silently then orphans commits
`basename "$WT"` returned `agent-XXXX` not `worktree-agent-XXXX`. `git merge agent-XXXX` errored with "not something we can merge" but execution continued. `git branch -D agent-XXXX` errored "branch not found" but the actual branch (with the wrong-name script logic) WAS deleted via different code path. Commits became unreachable until reflog recovery.

**Impact:** Recoverable in this case (commits within reflog window, SHAs visible in earlier output). Future executor scripts must use `git -C "$WT" rev-parse --abbrev-ref HEAD` to extract the actual branch name from the worktree, not derive it from the path.
**Source:** Session merge logic during Wave 2 cleanup

### Surprise 4 — 2 BLOCKER bugs (CR-01 + CR-02) shipped through 37/37 passing unit tests
Comprehensive test coverage gave false confidence. CR-01 (per-chunk full-text refade flicker) was invisible because jsdom doesn't run CSS keyframes — the test asserted className contained `streaming-chunk-fadein` but didn't verify the *scope* of what was animated. CR-02 (Sidebar active highlight color drifted from rgba(.18) to .11) was invisible because the test asserted className contained `bg-orange-soft` but didn't resolve the token to its current value.

**Impact:** Visual bugs need visual review even when unit coverage is "complete". `/gsd-code-review` standard depth caught both within ~10 minutes — non-negotiable gate before ship for UI work.
**Source:** `40-REVIEW.md` CR-01, CR-02

### Surprise 5 — CI Playwright E2E (pixel-diff) passed without baseline updates after Sidebar rewrite + 36-file sweep
Wave 2 expectation was that pixel-diff would flag at least the Sidebar rewrite (full structural change) and several swept components. Actual result: green on first attempt.

**Impact:** Either (a) Sidebar two-layer DOM produces visibly identical output to v2.0 width-animated DOM (D-40-08 geometry preserved correctly), and (b) `transition-claude-{fast|base|slow}` shorthand produces identical resolved CSS to verbose form (motion tokens unchanged). Both confirm Phase 40 was correctly scoped as a "wire tokens, don't redesign" phase. Production visual UAT should still confirm because CI baseline was likely captured against Phase 39, not v2.0.
**Source:** PR #128 CI monitor output

### Surprise 6 — Plan 01 took ~18 min for 6 tasks across 45 files; Plan 02 took ~7 min for 6 tasks across 9 files; Plan 03 took ~10 min for 4 tasks across 4 files
Plan 01 was 2-3× as long as Plans 02/03 despite Plans 02/03 having harder semantics (SSE streaming + sidebar geometry). The 56-file sweep + ESLint extension + cva primitive scaffolding dominated.

**Impact:** Mechanical sweeps look "easy" but consume significant agent context (file reads, regex iterations, post-sweep verification). Future planning should weight mechanical-sweep tasks closer to design-thinking tasks for time estimates.
**Source:** All 3 SUMMARY.md "Performance" sections
