# Phase 34: AI Features Live - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 34-ai-features-live
**Mode:** `--analyze --chain` (interactive batch with recommended defaults)
**Areas discussed:** A (Study Rec Surface), B (RAG Embedding), C (GPA Path Planner), D (Quality Gate / Fallback)

---

## Area A — Study Recommendation Surface (AIFEAT-01)

### A1. Main suggestion placement

| Option | Description | Selected |
|--------|-------------|----------|
| a | Dashboard hero (replace/augment greeting) | (part of c) |
| b | Predict page top "Today's focus" card | |
| c | Both: Dashboard 1 main + Predict Top-3 list | ✓ (default) |
| d | Right panel floating card | |

**User's choice:** c (default accepted)
**Notes:** Aligns with hero "stress-relief first" philosophy + reuses Predict page visibility.

### A2. Trigger timing

| Option | Description | Selected |
|--------|-------------|----------|
| a | Realtime on page load | |
| b | Daily 7am AEST scheduled cache | ✓ (default) |
| c | Recompute after every sync | |
| d | Manual user "refresh" button | |

**User's choice:** b (default accepted)
**Notes:** Mirrors existing digest scheduler pattern; cost-bounded.

### A3. Personalization input depth

| Option | Description | Selected |
|--------|-------------|----------|
| a | Auto-only (deadlines + weight + ROI + completion) | ✓ (default) |
| b | + study-time-budget slider | |
| c | + mood/energy tags | |

**User's choice:** a (default accepted)
**Notes:** Keeps cognitive load low; UI surface unchanged.

---

## Area B — RAG Embedding Strategy (AIFEAT-02)

### B1. Embedding scope

| Option | Description | Selected |
|--------|-------------|----------|
| a | All synced courses | |
| b | Lazy hot-set: courses accessed in last 7 days | ✓ (default) |
| c | Manual opt-in per course | |

**User's choice:** b (default accepted)
**Notes:** Voyage cost control; ~10x cheaper than blanket embedding.

### B2. Re-embed trigger

| Option | Description | Selected |
|--------|-------------|----------|
| a | Hash-diff on module sync → enqueue re-embed | ✓ (default) |
| b | First-embed only, no updates | |
| c | Weekly full re-embed | |

**User's choice:** a (default accepted)
**Notes:** Keeps RAG fresh without unnecessary recomputes.

### B3. Citation rendering

| Option | Description | Selected |
|--------|-------------|----------|
| a | Inline `[1][2]` superscripts + collapsible Sources panel | ✓ (default) |
| b | Sources list only (no inline markers) | |
| c | Hover tooltip with source excerpt | |

**User's choice:** a (default accepted)
**Notes:** Perplexity-style; fits existing chat shells.

---

## Area C — GPA Path Planner (AIFEAT-03)

### C1. Remaining-units data source

| Option | Description | Selected |
|--------|-------------|----------|
| a | Settings field: user inputs remaining credits/units | ✓ (default) |
| b | Auto-infer from typical Bachelor structure | |
| c | Upload USYD degree audit PDF (OCR) | |

**User's choice:** a (default accepted)
**Notes:** USYD has no public audit API; user input is canonical.

### C2. Target granularity

| Option | Description | Selected |
|--------|-------------|----------|
| a | Profile.gpa_target only | |
| b | 4 preset chips (Pass/Credit/Distinction/HD) | |
| c | Hybrid: chips for quick-pick + manual numeric override | ✓ (default) |

**User's choice:** c (default accepted)
**Notes:** Keeps existing target input; chips are additive UX.

### C3. Unreachable-target UX

| Option | Description | Selected |
|--------|-------------|----------|
| a | Plain "unreachable" message | |
| b | Suggest next-best reachable target with required avg | ✓ (default) |
| c | Lock input to max-reachable value | |

**User's choice:** b (default accepted)
**Notes:** Avoids dead-end UX; user can re-target consciously.

### C4. Output style

| Option | Description | Selected |
|--------|-------------|----------|
| a | Math result only ("avg 78 needed") | |
| b | AI-wrapped 30-50 word actionable line | ✓ (default) |
| c | Two-column card: math + AI prose | |

**User's choice:** b (default accepted)
**Notes:** Single coherent line per Phase 18 "20-30 word" style; AI fail → math-only fallback.

---

## Area D — Quality Gate & Fallback

### D1. Fallback strategy

| Option | Description | Selected |
|--------|-------------|----------|
| a | Per-feature graceful fallback (rec→ROI ranking; QA→keyword search; path→math only) | ✓ (default) |
| b | Global F1 gate (Phase 18 pattern, hide all on fail) | |
| c | QA fallback only; others hard-error | |

**User's choice:** a (default accepted)
**Notes:** Matches existing per-route fallback pattern; UX never goes blank.

### D2. UI transparency

| Option | Description | Selected |
|--------|-------------|----------|
| a | Show "currently using rule engine" banner | |
| b | Silent fallback (logged to Sentry only) | ✓ (default) |
| c | Debug-page-only indicator | |

**User's choice:** b (default accepted)
**Notes:** Users see degraded-but-coherent output; ops have visibility via Sentry.

### D3. Feedback button on study recommendations

| Option | Description | Selected |
|--------|-------------|----------|
| a | None — no objective ground truth | ✓ (default) |
| b | Add but don't gate F1 (log only) | |
| c | Add with independent helpful-rate metric | |

**User's choice:** a (default accepted)
**Notes:** Phase 18 feedback on Ed Discussion threads is unchanged; new surfaces stay clean.

---

## Claude's Discretion

- Exact prompt wording for study recommendation generator (must match Phase 18 "precise 20-30 word study guidance" rule)
- Cache table schema (TTL strategy, invalidation triggers)
- Hot-set tracker storage (dedicated table vs reuse `last_sync_at`)
- Embedding worker queue mechanism (in-DB queue vs APScheduler scan)
- i18n key naming for new strings
- Voyage retry policy (reuse existing adapter retry config)

## Deferred Ideas

- Push notifications → Phase 35
- AI prompt A/B testing → backlog
- Per-course F1 gates → backlog
- USYD degree audit auto-import → infeasible
- Feedback on study recs → no ground truth
- Mood / time-budget inputs → out of scope
- Fallback transparency banner → silent chosen
- Cross-semester trend viz → Phase 36 / v4.0
