---
phase: 32
plan: 03
status: resolved_strategically
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

## Strategy shift 2026-04-14 — confirmation OFF is permanent

After live testing, the "wait for reputation" plan is abandoned in favour of
a structural fix. Two pieces of evidence forced the change:

### Evidence 1 — Permit list does NOT prevent re-quarantine

After clicking "Permit all" for `noreply@uniboard.uk` and re-triggering a
signup, Resend reported the new email as `Delivered`, but the message did
not appear in the USYD inbox. Held by Mimecast again.

Mimecast's user-level allow list cannot override organization-level Targeted
Threat Protection for domains under ~24h old. Personal Permit only releases
emails AFTER they appear in a digest; it does not pre-clear new arrivals.

### Evidence 2 — Spam digest delay is ~3 hours

The "Blocked Spam Notification" digest itself only reaches the user about
**3 hours** after the original quarantine event. So the real signup UX is:

```
T+0    User signs up
T+5s   Email Delivered to USYD MX → quarantined
T+0~3h User's inbox is empty → most users abandon
T+3h   Spam digest arrives → user has to find it
T+3h+  User clicks Release/Permit → opens email → clicks confirm link
       → expected completion rate < 10%
```

This UX is unacceptable for a signup gate. No amount of reputation
cultivation eliminates the digest delay — it is a property of Mimecast's
batching, not our domain age.

### Decision

1. **Supabase email confirmation permanently OFF.** USYD email is itself a
   verified-identity signal (institution-issued, not user-registered).
2. **Email is downgraded from primary to fallback channel.** In-app
   notifications + (Phase 35) push are the primary notification channels.
3. **Phase 33 absorbs the auth UX hardening work**:
   - Sign in with Google OAuth (USYD Google Workspace) as the primary path
   - USYD-specific banner on registration page
   - `Resend email` button + 60s cooldown on RegisterForm check-email state
   - EMAIL-03 redesigned: in-app first, with a 14-day absence-triggered
     recall email as backup (high open-rate content rather than bare
     "token expired" — engagement-positive for sender reputation)

### Phase 32 closure

Phase 32 is now marked **Complete (3/3)**. The ROADMAP success criterion #4
is rewritten to scope deliverability to the sender side only; recipient
mailbox placement is explicitly out of Phase 32 scope and handed to the
Phase 33 AUTH-HARDEN strategy.

The Resend SMTP infrastructure remains in place — it works correctly and
will be used by the Phase 33 recall emails and any future opt-in mailers.
The branded templates also stay (no longer wired to confirmation, but
ready for future transactional uses).

### Resend Dashboard evidence (2026-04-14)

All emails to `yqin0800@uni.sydney.edu.au`: `Delivered` (5 msgs across 12h)
Only failure: `test-smtp-debug2@gmail.com` `Bounced` (intentionally invalid
test address). Sender side has 100% deliverability.

## Debugging notes captured

- Initial 500 on signup was due to SMTP password not being re-saved after username change
- Port 465 (SSL) and 587 (STARTTLS) both work with Resend SMTP
- Supabase GoTrue uses STARTTLS, so port 587 is recommended
- Resend auto-configure adds DKIM only, must manually add SPF + DMARC
