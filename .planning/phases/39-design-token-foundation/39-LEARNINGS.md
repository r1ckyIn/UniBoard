---
phase: 39
phase_name: "design-token-foundation"
project: "UniBoard"
generated: "2026-04-30T03:05:00Z"
counts:
  decisions: 6
  lessons: 5
  patterns: 5
  surprises: 5
missing_artifacts:
  - "39-UAT.md (deferred to production visual UAT — no formal UAT.md created)"
---

# Phase 39 Learnings: Design Token Foundation

## Decisions

### Token foundation only — no component visual refactor in Phase 39
Plans 39-01/02/03 publish tokens; only 39-04 sweeps existing components to consume them. v3.0 visual changes (typography rollout, spacing rhythm, color polish) belong to Phase 40+ that builds on this foundation.

**Rationale:** Each new milestone phase should have a single concern. Mixing "publish tokens" + "rebuild components with tokens" in one phase makes review harder and increases blast radius. Token publication is mechanical; visual judgment can be deferred.
**Source:** 39-CONTEXT.md D-01..D-04, 39-01-PLAN.md `must_haves.truths`

---

### Tailwind v4 native namespaces (`--text-*`, `--leading-*`, `--tracking-*`) over v3-style utility hardcoding
Typography tokens registered under v4-correct CSS variable namespaces so `text-hero`, `leading-section`, `tracking-caption` utilities generate automatically.

**Rationale:** v3-style hardcoding (e.g., `[font-size:2.8rem]`) loses Tailwind's native class generation. v4 `@theme` block reads `--{utility-namespace}-*` tokens and emits matching utilities for free.
**Source:** 39-02-PLAN.md, 39-RESEARCH.md §Tailwind-v4-namespaces

---

### `streaming-cursor-blink` uses `step-end infinite`, never `alternate`
SSE streaming cursor primitive uses `1s step-end infinite` for hard 50%/50% on/off blink. `alternate` produces a pulse (continuous opacity ramp), not a blink.

**Rationale:** Q7 in RESEARCH established that `alternate` interpolates opacity, producing a "pulsing" effect inconsistent with terminal-cursor convention. `step-end` snaps between keyframes, producing the expected blink.
**Source:** 39-RESEARCH.md §Q7, 39-03-PLAN.md `must_haves`, codified in 3 places (CSS comment, negative regex test, commit message) per safety-net pattern

---

### BSD sed playbook over jscodeshift/ts-morph for the 56-occurrence sweep
5-pass BSD sed migration on 36 .tsx files for `transition-{all|colors} duration-{N|[Xs]}` → motion-token form. Commit sed pass before manual cleanup so diff is reviewable.

**Rationale:** RESEARCH §Q3 evaluated jscodeshift/ts-morph: AST-aware migration is overkill at 56 mechanical occurrences. Sed gives a smaller, verifiable diff; visual review handles the 6 edge cases. Future-proof: ESLint rule prevents regression so the sweep doesn't need ongoing maintenance.
**Source:** 39-RESEARCH.md §Q3, 39-04-PLAN.md `objective`

---

### Defer Playwright pixel-diff baselines to production visual UAT
Plan 39-04 Task 3 was originally a `checkpoint:human-verify` step requiring local Playwright baseline generation. User chose to defer to prod visual UAT instead.

**Rationale:** Local Playwright baseline generation requires PERF_TEST_PASSWORD + Supabase env vars (user-only credentials). Avoiding the credential setup in this session is faster; ESLint rule continues to enforce no-raw-transitions going forward; visual UAT on Vercel preview provides equivalent human-eye verification. Tracked via SEED-39 with closure procedure for future trigger.
**Source:** User decision in this conversation, captured in 39-04-SUMMARY.md "Deferred Work" section + .planning/seeds/SEED-39-playwright-baselines.md

---

### Defer Tailwind v4 `@utility` DRY refactor to Phase 40 SHARED-01
Simplify pass identified that 36 .tsx files repeat the same 102-char `transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]` string. A single Tailwind v4 `@utility transition-claude-fast { ... }` could replace it everywhere.

**Rationale:** Refactoring 36 sites again immediately after the migration sweep would create two near-identical PRs. Phase 40 SHARED-01 is the natural place to introduce shared abstractions alongside other shared-component polish work. Captured via SEED-40 with effort estimate (~1.5 hr) and trigger conditions.
**Source:** /simplify pass output (3 parallel review agents) + SEED-40-motion-utility-dry-refactor.md

---

## Lessons

### Sed migration creates timing-function token override bugs
The 4 code-review warnings (WR-01..WR-04) all had the same pattern: sed correctly added the token form to className strings, but pre-existing legacy timing-function declarations (literal `ease-[cubic-bezier(...)]`, trailing `ease-out`, inline `style.transitionTimingFunction`) silently overrode the new token via CSS cascade or specificity. Sed regex matches text but does not understand CSS rules.

**Context:** Sidebar duplicate ease class, DeadlineCard/PredictCard inline style overriding className token, DeadlineTimeline/RecentActivity trailing ease-out conflict, NotificationsSection `after:` pseudo-element uncaught by ESLint regex. All 4 files had v2.0 timing declarations from prior phases that the sweep didn't see.
**Source:** 39-REVIEW.md WR-01..WR-04 + 4 fix commits (782e5af, 9d38a2c, 81aeae3, d5195c2)

---

### ESLint `no-restricted-syntax` regex must explicitly handle modifier prefixes
Original selector `Literal[value=/transition-(all|colors)\s+duration-(\[[^\]]*\]|\d+)/]` did not match Tailwind modifier-prefixed forms like `after:transition-all after:duration-200`. The `\s+` between `transition-all` and `duration-N` doesn't match `after:` interrupting both halves.

**Context:** `NotificationsSection.tsx:172` toggle had `after:transition-all after:duration-200` that slipped through both the sed sweep and the ESLint rule. Discovered during quality review (Quality Agent finding #3 in /simplify pass).
**Source:** WR-04 in 39-REVIEW.md, fix commit d5195c2 (added `(?:[a-z][a-z0-9-]*:)*` optional prefix groups on both halves)

---

### Tailwind v4 PostCSS minifier removes empty CSS rules
Empty `[data-theme="dark"] {}` placeholder block reserved for Phase 43 was stripped from the production CSS bundle. MCP-verified post-deploy: `has_data_theme_dark: false` in `7cf4913a98f2a700.css`.

**Context:** Originally added as syntactic intent — declaring "dark mode hook lives here" without yet adding rules. Phase 43 implementer must remember to add the rule fresh, not assume an empty stub exists in compiled CSS.
**Source:** Chrome DevTools MCP grep on production CSS during GAP-39-01 resolution (this session)

---

### culori `formatCss` rounding ≠ `toFixed(4)` rounding emitted to CSS literal
hex-to-oklch.mjs round-trip: parses hex → converts to oklch → formats via `formatCss(okl)` → re-parses → measures ΔE. Re-parse is on `formatCss` output (culori's own rounding), but the CSS literal actually committed is `toFixed(4)`-rounded. Round-trip measures `formatCss` fidelity, not the literal-emit fidelity.

**Context:** Build-time script, runs rarely, ΔE 0.0000 in practice for our 15 PALETTE entries. Acceptable but worth documenting — could matter if PALETTE expands or non-oklch-friendly colors are added.
**Source:** /simplify efficiency review IN-02 + Quality review IN-02

---

### Token-foundation phases produce no perceptible UI change — set expectations
User reasonably expected visible difference post-deploy, but Phase 39's design intent (additive layer, zero visual regression) means token migration produces near-identical output. Brand ease (`cubic-bezier(0.165, 0.85, 0.45, 1)`) vs Material (`cubic-bezier(.4, 0, .2, 1)`) differ subtly — only perceptible on specific interactions (Sidebar hover-expand, expandable cards). Static page comparison shows no diff.

**Context:** User said "好像没部署成功吧ui没有变化" after merging to prod. MCP-verified the token layer is correctly deployed (CSS file is new, all tokens present, computed styles resolve). The "no diff" is by design.
**Source:** User feedback this session + 39-VERIFICATION.md GAP-39-01 resolution narrative

---

## Patterns

### TDD per plan: RED → GREEN → docs commit triplet
Every plan in Phase 39 committed in this order:
1. `test(N-MM): add failing tests` (RED — tests committed first, must fail)
2. `feat/refactor(N-MM): add implementation` (GREEN — tests pass)
3. `docs(N-MM): complete plan` (SUMMARY.md + STATE.md + REQUIREMENTS.md)

**When to use:** Every TDD plan in this codebase. Reduces "wrote tests after impl" anti-pattern; commits provide an audit trail showing tests were genuinely failing before implementation. 12 commits across 4 plans (3×4) followed this triplet exactly.
**Source:** Commits 726eb10/c1de7c9/506e3d5 (Plan 1), 69e5988/c2e42b8/b8be445 (Plan 2), 1a8e434/28e750c/69a100f (Plan 3), 40b6501/29f6cf9/6fd2e11 (Plan 4)

---

### Env-gated Playwright spec stub for deferrable visual baselines
`frontend/tests/e2e/phase39-transition-parity.spec.ts` is committed in-tree but auto-skips when `PERF_TEST_PASSWORD` is unset (via `shouldRunPerfSuite()` helper). CI passes "vacuously" — suite reports 0 failures because tests skip.

**When to use:** Any time visual/E2E baselines need to be generated locally with credentials but you want to commit the spec authoring now without forcing baseline generation. SEED-N closure procedure later runs the same spec with `--update-snapshots`. Phase 38 P04 established the convention.
**Source:** 39-03 spec scaffold + frontend/tests/e2e/perf/helpers/auth.ts shouldRunPerfSuite()

---

### Squash-merge milestone-init branches with mixed planning+code history
chore/milestone-v3.0-init carried 29 commits including v3.0 milestone bootstrap, Phase 39 planning docs, code review reports, and Phase 39 execution. Cherry-pick + path filter approach failed (transient `.planning/` files conflicted across commits). Switched to: `git diff main..feature -- :!planning_dirs > patch && git apply patch && git commit` produces a single clean code-only commit.

**When to use:** Milestone-init or long-lived feature branches with extensive `.planning/` traffic. Single squash commit removes reviewer noise; full dev history stays on the working branch. PR #127 used this — 1 commit on PR branch (61 files, +1753/-388), 24 commits on dev branch (full GSD trail).
**Source:** This session's `/gsd-pr-branch` workflow attempt + recovery

---

### MCP-verified evidence for closing UAT gaps
Chrome DevTools MCP can fetch production CSS, grep for token names, inspect computed styles — providing programmatic proof of token landing instead of relying on subjective "looks right" claims. Used to resolve GAP-39-01 with concrete evidence (CSS lastModified, etag, all 10 token-presence checks passing).

**When to use:** Any phase where prod visual UAT is the closure mechanism. Adds machine-verifiable evidence to the human "looks right" claim. Particularly valuable for token/CSS phases where the visible-change-may-be-zero (this phase's exact case).
**Source:** This session's MCP-driven GAP-39-01 resolution

---

### `BRAND_COLOR_NAMES` → `SOFT_VARIANT_NAMES` — name by behavior, not by category
Original `BRAND_COLOR_NAMES` set in hex-to-oklch.mjs included project palette colors (amber, purple, red) — misleading name. Real common trait: "colors that get a -soft variant emitted alongside the base color".

**When to use:** When a Set/array's membership criterion is "behavior X applies", name it `XX_THAT_GET_X_TREATMENT` not `XX_BY_CATEGORY`. Categories drift; behaviors stabilize.
**Source:** /simplify quality review finding #1 + commit d69d657

---

## Surprises

### CI Playwright E2E (pixel-diff) check passed despite no baselines committed
Expected: deferred Playwright baselines would surface as a CI failure, requiring an explicit "skip" or override. Reality: env-gating made the suite skip cleanly when CI's environment lacked PERF_TEST_PASSWORD. Reported "pass" with 0 tests run.

**Impact:** Validates the "env-gated stub" pattern as a low-friction way to defer baseline generation. CI doesn't block the merge; future closure just runs `--update-snapshots` when env is provisioned.
**Source:** PR #127 CI rollup — "Playwright E2E (pixel-diff)" passed in 2m8s

---

### User could not perceive v3.0 brand ease vs v2.0 Material ease at static-browse level
Expected: The cubic-bezier curve change (`(.165,.85,.45,1)` brand vs `(.4,0,.2,1)` Material) would be visibly different on hover/transition. Reality: Static browsing of the prod site felt identical to v2.0; user thought deployment had failed.

**Impact:** Token-foundation phases need upfront framing — "you will not see visible UI change; success is verified via DevTools/MCP, not eyes." Future Phase 40+ that consume tokens for visible polish should be the user-facing visual milestone marker.
**Source:** User message "好像没部署成功吧ui没有变化" + subsequent MCP CSS verification

---

### First Load JS unchanged at 220 kB despite 56 transition migrations + 21 oklch tokens + @supports fallback
Expected: 56 className changes adding 80-character arbitrary-property triples (`[transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]`) plus 21 new oklch declarations and a 21-token hsl fallback block would add measurable bundle weight. Reality: First Load JS unchanged.

**Impact:** Tailwind v4 deduplicates arbitrary-property utilities globally (~6 unique classes generated for 56 occurrences). HTML class strings grew but not enough to register at the rounding granularity reported. Validates the "use Tailwind native, don't reinvent" approach.
**Source:** 39-04-SUMMARY.md build verification + /simplify efficiency review #4

---

### `git cherry-pick` + `git rm --cached` path-filter approach failed cross-commit
Expected: GSD's documented `pr-branch` workflow (cherry-pick + unstage transient paths) would produce a clean PR branch. Reality: commit d25d0d0 (which both modifies a structural ROADMAP.md AND deletes transient files) failed with `DU` (deleted-by-us, modified-by-them) conflicts because the prior cherry-pick's worktree state had the transient files still present.

**Impact:** The recommended workflow has an edge case for "mixed structural+transient deletion" commits. Single-squash via `git diff + git apply` is more robust for milestone-init branches. Worth surfacing to GSD upstream.
**Source:** This session's pr-branch workflow attempt + recovery

---

### Empty `[data-theme="dark"] {}` reservation block does NOT survive PostCSS minification
Expected: Reserved an empty selector block in globals.css for Phase 43 to fill. Reality: production CSS bundle has no trace of the selector — minifier strips empty rules.

**Impact:** "Empty placeholder" pattern is a no-op in compiled output. Phase 43 implementer cannot rely on the placeholder existing — they must add the rule with content fresh. Document this in CONVENTIONS.md so future phases that "reserve" CSS structure understand it's compile-time visible only.
**Source:** Chrome DevTools MCP grep `has_data_theme_dark: false` on prod CSS file `7cf4913a98f2a700.css`
