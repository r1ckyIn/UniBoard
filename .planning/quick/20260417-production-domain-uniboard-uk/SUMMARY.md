---
name: production-domain-uniboard-uk
slug: production-domain-uniboard-uk
date: 2026-04-17
type: quick
status: complete
branch: fix/production-domain-uniboard-uk
---

## What shipped

Bound purchased domain `uniboard.uk` to production and aligned code hardcodes.

### Infra (no code commits)
- Vercel: added `uniboard.uk` + `www.uniboard.uk` to project `uni-board` (CLI)
- Railway: added `api.uniboard.uk` to service `UniBoard` (port 8080, via dashboard)
- Cloudflare DNS (4 records, DNS-only / grey-cloud, via REST API using session cookie — UI react-select blocked manual entry):
  - A `uniboard.uk` → `76.76.21.21`
  - A `www.uniboard.uk` → `76.76.21.21`
  - CNAME `api.uniboard.uk` → `5j89kf21.up.railway.app`
  - TXT `_railway-verify.api.uniboard.uk` → `railway-verify=27922aaba…`
- Vercel env `NEXT_PUBLIC_API_URL` (production): `https://uniboard-production.up.railway.app` → `https://api.uniboard.uk`

### Code
- `src/config.py:74`: `ses_sender_email` default → `digest@uniboard.uk`
- `src/email/ses.py:24`: sender default → `digest@uniboard.uk`
- `frontend/openapi/openapi.yaml:9`: production server url → `https://api.uniboard.uk/v1`
- `docs/deployment.md` (×4): env var example values

## Verification

- DNS: confirmed via DoH (cloudflare-dns.com/dns-query). All 4 records resolvable.
- SSL apex: `curl -I https://uniboard.uk` → HTTP 307 with HSTS. Vercel edge live.
- SSL `www.uniboard.uk` + `api.uniboard.uk`: certs still provisioning (async, typ. 1–10 min).

## Follow-up (user manual)

1. **Wait 5–15 min** for `www` + `api` SSL issuance, then confirm:
   - `curl -I https://www.uniboard.uk` → 2xx/3xx
   - `curl -I https://api.uniboard.uk/health` → 200
2. **Vercel auto-redeploys** on env var change; verify new deploy picks up `NEXT_PUBLIC_API_URL`.
3. **Supabase Auth**: TRD §16.5 records Site URL + Redirect URLs already on `uniboard.uk` (Phase 33 AUTH-HARDEN). Browser-verify after SSL lands.
4. **TRD §12 / §16** still reference `uniboard.app` — stale historical AWS plan; not blocking. Update in a future docs pass.

## Notes

- Kept Cloudflare as NS (not migrating to Vercel NS) to preserve existing Resend SPF/DKIM/DMARC and MX records.
- Proxy disabled (grey cloud) on all new records so Vercel/Railway can issue Let's Encrypt certs unimpeded.
- Cloudflare UI DNS form uses React-controlled `textarea` with a proprietary state model that ignores programmatic `value` setters — used `/api/v4/zones/.../dns_records` POST with `credentials: 'include'` as workaround.
