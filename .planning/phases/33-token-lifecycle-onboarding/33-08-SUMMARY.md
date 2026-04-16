---
phase: 33-token-lifecycle-onboarding
plan: 08
subsystem: docs
tags: [auth, email, supabase, mimecast, documentation, AUTH-HARDEN-04]
requirements: [AUTH-HARDEN-04]
dependency_graph:
  requires: []
  provides:
    - TRD §7.5 Email Confirmation Policy (permanent-OFF rationale)
    - TRD §16.9 Supabase Auth Configuration (local-vs-prod divergence)
    - PROJECT.md Key Decisions entry for email-confirmation-OFF
    - supabase/config.toml inline comment explaining divergence
  affects:
    - Future onboarding docs for new contributors
    - Phase 33 AUTH-HARDEN-01/02/03 implementation plans
tech-stack:
  added: []
  patterns:
    - "Decision-rationale cross-referencing: config-file comment → PROJECT.md → TRD"
key-files:
  created: []
  modified:
    - docs/UniBoard_TRD_v2.md
    - .planning/PROJECT.md
    - supabase/config.toml
decisions:
  - "Email confirmation permanently OFF in production (Mimecast quarantine)"
  - "Local dev keeps confirmations ON for parity testing"
  - "Documentation anchored in three canonical locations (TRD, PROJECT.md, config.toml)"
metrics:
  duration_min: 2
  tasks_completed: 2
  files_modified: 3
  completed_date: "2026-04-15"
---

# Phase 33 Plan 08: Email Confirmation Policy Documentation Summary

Three-point documentation trail (TRD §7.5 + §16.9, PROJECT.md Key Decisions, supabase/config.toml inline comment) recording the permanent-OFF email-confirmation decision and the intentional local-vs-prod Supabase Auth divergence.

## Objective Recap

AUTH-HARDEN-04 is documentation-only. Phase 32-03 strategically resolved the email confirmation question by turning it OFF in Supabase Studio, but no document recorded the rationale. This plan creates the durable trail so the decision survives future audits and onboarding — the `enable_confirmations = true` in `supabase/config.toml` would otherwise appear inconsistent with production, inviting a "fix" that would reintroduce the Mimecast signup-UX problem.

## What Was Built

### Task 1 — TRD §7.5 + §16.9 (commit e7464bb)

Added two new subsections to `docs/UniBoard_TRD_v2.md`:

- **§7.5 Email Confirmation Policy** (under §7 Security). Documents the permanent-OFF status, the Mimecast quarantine root cause (3-hour digest delay for `uniboard.uk` sender mail reaching `@uni.sydney.edu.au` recipients), and the four-layer AUTH-HARDEN mitigation stack (Google OAuth primary, USYD banner, password-reset resend, permanent-OFF documentation). Includes explicit note that recipient-side deliverability is a recipient-policy issue distinct from sender-side acceptance (Resend reports 100% Delivered, SPF/DKIM/DMARC all pass). Cross-references §16.9.
- **§16.9 Supabase Auth Configuration** (under §16 Deployment). Documents production Supabase Dashboard settings (Confirm email OFF, Google provider ON, Site URL, Redirect URLs, Resend SMTP fallback) and local dev `supabase/config.toml` settings. Explains why the divergence is intentional (local parity testing of /auth/confirm route + email templates without Mimecast dependency).

### Task 2 — PROJECT.md + config.toml (commit 0710cf9)

- **`.planning/PROJECT.md` Key Decisions table** gains a row: "Supabase email confirmation: permanently OFF" with full rationale (Mimecast, AUTH-HARDEN-01/02/03 cross-refs) and pointer to TRD §7.5/§16.9.
- **`supabase/config.toml`** receives a 3-line comment block immediately above `enable_confirmations = true` flagging that production has it OFF (set in Supabase Studio), that local keeps it true for parity testing, and pointing readers to PROJECT.md Key Decisions and TRD §7.5 for the rationale. No runtime config changed — `enable_confirmations = true` stays as-is for local.

## Files Modified

| File | Change |
|------|--------|
| `docs/UniBoard_TRD_v2.md` | +38 lines (two new subsections §7.5 and §16.9) |
| `.planning/PROJECT.md` | +1 line (Key Decisions table row) |
| `supabase/config.toml` | +3 lines (comment block above `enable_confirmations`) |

## Decisions Made

- **Anchored the documentation in three canonical locations** instead of one: the TRD (authoritative technical spec), PROJECT.md (decision log for the planning system), and config.toml (where a developer would actually encounter the divergence). This redundancy is intentional — a developer investigating `enable_confirmations = true` will see the comment, then be able to follow the breadcrumb trail into either higher-level document.
- **Used §7.5 and §16.9** rather than §7.X / §16.X numbering — §7 currently has §7.1–§7.4, and §16 has §16.1–§16.8, so the new subsections continue the existing numbering without disrupting TOC or existing references.
- **Preserved the existing `enable_confirmations = true` line** in config.toml rather than changing it to `false` or removing it. The comment block makes the local-vs-prod divergence intentional and auditable, avoiding the risk that a future developer "cleans up" the apparent inconsistency.

## Deviations from Plan

None — plan executed exactly as written. The plan suggested §7.X / §16.X placeholder numbering; during execution we resolved X to 5 and 9 respectively by inspecting the existing TRD section structure. The cross-references in the TRD text use `§7.5` and `§16.9` (the resolved numbers) rather than `§7.X` / `§16.X` so future readers don't need to guess.

## Verification Results

All five plan-level verification steps pass:

1. `grep -c 'Email Confirmation Policy' docs/UniBoard_TRD_v2.md` → **1**
2. `grep -c 'Supabase Auth Configuration' docs/UniBoard_TRD_v2.md` → **1**
3. `grep -c 'email confirmation: permanently OFF' .planning/PROJECT.md` → **1**
4. `grep -B 2 'enable_confirmations = true' supabase/config.toml` → **shows the 3-line comment block as expected**
5. Diff-purity check on `supabase/config.toml` → **0 non-comment additions** (no runtime change)

All Task 1 and Task 2 acceptance criteria also pass (cross-references verified, AUTH-HARDEN-01/02/03 all cited in PROJECT.md entry, comment references both PROJECT.md and TRD §7.5).

## Self-Check: PASSED

**Files claimed created/modified — verified:**

- `docs/UniBoard_TRD_v2.md` — FOUND, grep confirms new subsection headings present
- `.planning/PROJECT.md` — FOUND, grep confirms new Key Decisions row
- `supabase/config.toml` — FOUND, grep confirms new comment block
- `.planning/phases/33-token-lifecycle-onboarding/33-08-SUMMARY.md` — FOUND (this file)

**Commits claimed — verified:**

- `e7464bb` — FOUND in git log (Task 1: TRD updates)
- `0710cf9` — FOUND in git log (Task 2: PROJECT.md + config.toml)

## Success Criteria Contribution

Plan 33-08 satisfies AUTH-HARDEN-04 (documentation-only requirement) and contributes to ROADMAP success criterion #7 ("Supabase email confirmation permanently OFF; documented decision"). The decision now has a durable trail in the three canonical locations — future audits and onboarding will find the rationale without needing to reconstruct it from Phase 32-03 and commit archaeology.
