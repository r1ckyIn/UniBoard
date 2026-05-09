---
slug: pause-uniboard-infra
type: chore-ops
status: complete
created: 2026-05-09
---

# Pause UniBoard Infrastructure

## Objective

Suspend all recurring UniBoard infra activity so the project incurs no ongoing compute or scheduled work until the user resumes it later. Operation must be **fully reversible** — no deletes, no destructive changes.

## Context

- v3.0 milestone cancelled 2026-05-04 (PR #133 reverted Phases 39+40)
- Project status: BETWEEN MILESTONES, no active development
- User direction (2026-05-09): pause everything, revisit when there is bandwidth

## Inventory & Disposition

| Component | Pre-pause state | Action |
|-----------|-----------------|--------|
| Local dev servers (uvicorn / pnpm) | Not running | None |
| Local Supabase (Docker) | Not running (Docker daemon down) | None |
| Supabase remote project `UniBoard` (ref `brcsgbxnflyxbmijwbte`, Sydney) | ACTIVE | **Paused via MCP** (`mcp__claude_ai_Supabase__pause_project`) |
| Vercel project `uni-board` (`prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ`, uniboard.uk) | ACTIVE on hobby plan | **Kept active** — hobby plan = zero recurring cost; Vercel "Pause Project" is Pro-only; CLI has no pause subcommand. Frontend will still serve but API calls will fail until backend resumes. |
| Railway service (Python FastAPI, api.uniboard.uk) | CLI session expired (`Unauthorized`) | **User-manual** — needs `railway login` then dashboard "Pause" |
| GitHub Actions `railway-warmup.yml` (cron `*/10 * * * *`) | ACTIVE | **Disabled** — cron schedule commented out (this PR) |
| GitHub Actions `railway-coldstart-measure.yml` | `workflow_dispatch` only | None (already manual-only) |
| GitHub Actions `backend-ci.yml`, `frontend-ci.yml` | push / PR triggers | None (no traffic if no commits) |
| Sentry | EU org, business trial expired ~2026-04-19 | None (already inactive) |

## Tasks (Executed)

1. ✅ Disabled `railway-warmup.yml` cron — commented `schedule:` block, kept `workflow_dispatch` for future manual triggers.
2. ✅ Paused Supabase project `brcsgbxnflyxbmijwbte` via MCP (`{"success":true}` response).
3. ✅ Created this PLAN.md and accompanying SUMMARY.md.
4. ⏭ Did **not** modify `.planning/STATE.md` on this branch — `main` branch's STATE.md is stale (still references Phase 38.2 executing); a STATE refresh would balloon scope. Pause status is captured here in the quick-task directory and surfaced in the PR description.

## Out of Scope

- Source code under `src/` and `frontend/` — no changes
- Untracked working-tree files (prototypes, screenshots, graphify outputs, `.vercel/`, `.playwright-mcp/`) — left as-is
- v3.0 phase artifacts on `chore/milestone-v3.0-init` — preserved local-only as documented in that branch's STATE.md
- STATE.md refresh on main — separate task if/when project resumes

## Resume Runbook

When the user wants to reactivate UniBoard:

1. **Restore Supabase** — Supabase dashboard → project `UniBoard` → click "Restore project". Wait ~2 min for DB + Auth to come back online.
2. **Wake Railway** — `railway login` → Railway dashboard → service → "Resume" or trigger a redeploy. Wait for `/health` to return 200.
3. **Re-enable cron** — uncomment the two `# schedule:` / `# - cron:` lines in `.github/workflows/railway-warmup.yml`. Commit as `chore: re-enable railway warmup cron` and merge.
4. **Smoke test**:
   - `curl https://api.uniboard.uk/health` → expect `{"status":"ok"}`
   - Open https://uniboard.uk → log in → verify deadlines/courses load
5. **Refresh STATE.md** on main to reflect actual current milestone (it is stale today, frozen at Phase 38.2 executing).
