---
phase: 32
plan: 03
status: partial
completed: 2026-04-14
---

# Plan 32-03: Manual Resend/Supabase Config + E2E Verification

## What was done

### Resend Setup ✓
- Resend account created, API key generated: `re_RShZXnc...`
- Custom domain `uniboard.uk` registered via Cloudflare Registrar ($5.30/year)
- Domain added to Resend with region `eu-west-1`
- DNS records configured:
  - DKIM (auto-configured by Resend via Cloudflare API)
  - SPF: `v=spf1 include:send.resend.com ~all`
  - DMARC: `v=DMARC1; p=none; rua=mailto:rickyqin919@gmail.com`
- Domain verified in Resend

### Supabase Dashboard Config ✓
- SMTP configured: `smtp.resend.com:587`, STARTTLS, username `resend`
- Sender: `UniBoard <noreply@uniboard.uk>`
- Email templates pasted: confirmation.html + recovery.html
- URL Configuration: Site URL + 3 redirect URLs (prod, preview wildcard, localhost:3001)

### E2E Verification — PARTIAL
- ✓ SMTP connection verified (direct Python test)
- ✓ Signup API call succeeds with `confirmation_sent_at` set
- ✓ Gmail receives confirmation email (verified via direct SMTP test)
- ✗ USYD university email (@uni.sydney.edu.au) does NOT receive emails
  - Root cause: domain `uniboard.uk` registered < 24h, no email reputation
  - Microsoft 365 (USYD mail) rejects/quarantines new-domain emails
  - Expected resolution: 24-48h as reputation builds

## Current Production State

**Email confirmations: TEMPORARILY DISABLED** in Supabase Auth settings.
Users can register with USYD email without confirmation while domain reputation builds.

## Follow-up required (after 24-48h)

1. Test email delivery to `@uni.sydney.edu.au` again
2. Re-enable "Confirm email" toggle in Supabase Dashboard
3. Remove any test users created during bypass period

## Debugging notes captured

- Initial 500 on signup was due to SMTP password not being re-saved after username change
- Port 465 (SSL) and 587 (STARTTLS) both work with Resend SMTP
- Supabase GoTrue uses STARTTLS, so port 587 is recommended
- Resend auto-configure adds DKIM only, must manually add SPF + DMARC
