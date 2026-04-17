---
name: production-domain-uniboard-uk
description: Bind purchased domain uniboard.uk to Vercel (frontend) + Railway (api.uniboard.uk) and sync code/env hardcodes
slug: production-domain-uniboard-uk
date: 2026-04-17
type: quick
status: in-progress
branch: fix/production-domain-uniboard-uk
---

## Problem

Purchased domain `uniboard.uk` (Cloudflare Registrar, Phase 32) is not bound to production.
Current prod URLs: `uni-board-tau.vercel.app` (frontend), `uniboard-backend.up.railway.app` (API).
Codebase also contains stale `uniboard.app` hardcodes from original TRD plan.

## Scope

- Bind `uniboard.uk` + `www.uniboard.uk` to Vercel project `uni-board`
- Bind `api.uniboard.uk` to Railway service `uniboard-backend`
- Add required DNS records in Cloudflare (DNS-only / grey-cloud for platform SSL)
- Replace hardcoded `uniboard.app` with `uniboard.uk`
- Update Vercel env `NEXT_PUBLIC_API_URL` -> `https://api.uniboard.uk/api/v1`
- Confirm Supabase Auth Site URL + Redirect URLs already use `uniboard.uk`

## Out of scope

- Email sending (already on `uniboard.uk` via Resend, Phase 32)
- Redirects from old `*.vercel.app` (Vercel serves old URL in parallel)

## Steps

1. Vercel CLI: `vercel domains add` for root + www, capture DNS instructions
2. agent-browser Railway dashboard: add `api.uniboard.uk`, capture CNAME target
3. agent-browser Cloudflare DNS: add records (A / CNAME), grey-cloud (DNS-only) for `@`, `www`, `api`
4. Poll until SSL issued on all three hostnames
5. Code edits: `src/config.py`, `src/email/ses.py`, `openapi/openapi.yaml`, `docs/deployment.md`
6. `vercel env rm/add NEXT_PUBLIC_API_URL` (production scope)
7. agent-browser Supabase dashboard: verify Auth Site URL + Redirect URLs
8. Commit, push, PR, ship
