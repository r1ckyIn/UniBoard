---
slug: pause-uniboard-infra
type: chore-ops
status: complete
created: 2026-05-09
completed: 2026-05-09
---

# Summary — Pause UniBoard Infrastructure

## Outcome

UniBoard project paused. All recurring infra activity that Claude could control from this session has been suspended; two items require the user's manual action (documented below).

## What Was Done

| # | Action | Result |
|---|--------|--------|
| 1 | Paused Supabase project `UniBoard` (ref `brcsgbxnflyxbmijwbte`, Sydney) via `mcp__claude_ai_Supabase__pause_project` | ✅ `{"success":true}` — DB + Auth offline |
| 2 | Disabled `railway-warmup.yml` cron — commented `schedule:` block, kept `workflow_dispatch` for future manual triggers | ✅ Verified via grep; no cron schedule active |
| 3 | Created PLAN.md + this SUMMARY.md under `.planning/quick/20260509-pause-uniboard-infra/` | ✅ |

## What Was NOT Done (user-manual)

| Item | Why Claude can't do it | What user should do |
|------|------------------------|---------------------|
| Pause Railway service (`api.uniboard.uk`) | `railway` CLI session expired (`Unauthorized. Please login with railway login`) | Run `railway login` → open Railway dashboard → service → "Pause" or "Sleep". Optional: also pause any Postgres add-on. |
| Vercel project pause | Vercel hobby plan does not expose a "Pause Project" feature (Pro-only); `vercel` CLI has no pause subcommand | **Decided to keep Vercel active** — hobby = free, no recurring cost. uniboard.uk will fail to call the paused API (expected). If user wants to also stop accidental builds, run `vercel git disconnect`. |
| Refresh `.planning/STATE.md` on main | Main's STATE.md is stale (Phase 38.2 executing, 2026-04-22). Updating it to reflect v2.0-shipped + v3.0-cancelled + paused balloons scope beyond a "pause infra" PR. | Optional follow-up: do a STATE.md refresh PR before/at resume time. |

## Verification

- Supabase project status: paused (MCP returned `{"success":true}`)
- Cron schedule: confirmed commented in `.github/workflows/railway-warmup.yml` lines 25–26
- No production code touched

## Resume Runbook

When the user wants to reactivate UniBoard:

1. **Restore Supabase** — Supabase dashboard → project `UniBoard` → "Restore project" (~2 min)
2. **Wake Railway** — `railway login` → Railway dashboard → service → "Resume"; wait for `/health` 200
3. **Re-enable cron** — uncomment the two `# schedule:` / `# - cron:` lines in `.github/workflows/railway-warmup.yml`; commit as `chore: re-enable railway warmup cron`
4. **Smoke test** — `curl https://api.uniboard.uk/health` returns 200; https://uniboard.uk login + deadlines work
5. **Refresh STATE.md** on main to current milestone

## Files Touched

- `.github/workflows/railway-warmup.yml` — schedule commented, header rewritten with re-enable instructions
- `.planning/quick/20260509-pause-uniboard-infra/PLAN.md` — created
- `.planning/quick/20260509-pause-uniboard-infra/SUMMARY.md` — this file

## Out of Scope (untouched)

- `.planning/STATE.md` (stale on main — separate refresh task)
- Untracked working-tree files (prototypes, screenshots, graphify outputs, `.vercel/`, `.playwright-mcp/`)
- Source code under `src/` and `frontend/`
- Sentry (already inactive)
