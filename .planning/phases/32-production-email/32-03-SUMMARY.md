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

## Update 2026-04-14 — Mimecast quarantine confirmed (NOT reject)

Inspection of a USYD inbox revealed that confirmation emails are being **held**
by Microsoft 365 / Mimecast spam quarantine, not rejected. The "Blocked Spam
Notification" digest exposes a per-user "Permit / Release / Block" workflow.

Implications:
- DNS (SPF/DKIM/DMARC) is correct — emails reach USYD MX servers
- Resend → MX path works
- Quarantine is purely a sender-reputation issue against the < 24h-old
  `uniboard.uk` domain
- Resolution is **time + cumulative trust signals**, not a code/config fix

## Reputation cultivation strategy

**Goal:** Move `uniboard.uk` from "unknown sender → quarantine" to
"trusted sender → inbox" in Mimecast's collective reputation graph.

### Pace

- 24-48h: still expect quarantine for new USYD recipients (today's domain age)
- 3-7 days: cumulative Permit signals start unlocking some recipient subgroups
- 2 weeks+: sustained low-bounce + low-complaint usage typically clears
  default quarantine, barring negative signals

### Required user behaviour (early-alpha protocol)

Brief every alpha tester verbally or in onboarding copy:

1. **Always click "Permit"** in the Held Messages digest. This is the strongest
   per-user trust signal.
2. **Never click "Block"** or "Mark as Spam" — a single Block can poison the
   reputation across the recipient's department/faculty subgroup.
3. If an email lands in inbox but looks suspicious, click "Not Spam" rather
   than ignoring it.
4. Open the email if curious — open events feed Mimecast engagement signals.

### Sender-side hygiene (already met, must stay met)

- Bounce rate < 2% (Resend dashboard tracks this; do not blast invalid addresses)
- Complaint rate near 0%
- Single confirmation email per signup attempt; the existing 32-02 frontend
  must not retry-send within a short window. (Note: the 3 emails seen at
  09:19 / 09:22 / 09:23 were caused by manual re-clicks during testing, not
  a system retry loop — confirmed 2026-04-14.)
- Keep email body clean: no link shorteners, no excessive images, no all-caps subject

### When to retest

After **48-72h** with at least 5 Permit votes from distinct USYD users:

1. Pick a **fresh** USYD address that has **never** Permit'd `noreply@uniboard.uk`
2. Trigger signup
3. If it lands in inbox → flip Supabase confirmation back ON
4. If still held → wait another 48h, do not change strategy

### Escalation triggers (only if 2-week mark fails)

- Switch to OTP 6-digit code via Supabase Auth (Mimecast is more lenient with
  short code emails than magic-link URLs)
- Add `hello@uniboard.uk` (replyable) alongside `noreply@uniboard.uk` —
  bidirectional addresses earn faster trust
- Last resort: secondary domain (`uniboard.app` or `.io`) with longer history

## Debugging notes captured

- Initial 500 on signup was due to SMTP password not being re-saved after username change
- Port 465 (SSL) and 587 (STARTTLS) both work with Resend SMTP
- Supabase GoTrue uses STARTTLS, so port 587 is recommended
- Resend auto-configure adds DKIM only, must manually add SPF + DMARC
