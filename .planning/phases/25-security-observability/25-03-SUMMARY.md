---
phase: 25-security-observability
plan: 03
subsystem: frontend
tags: [security-headers, error-boundaries, i18n, next-config]
dependency_graph:
  requires: []
  provides: [security-headers, error-boundaries]
  affects: [frontend/next.config.ts, frontend/app]
tech_stack:
  added: []
  patterns: [next-config-headers, error-boundary-pattern, inline-styles-for-root-error]
key_files:
  created:
    - frontend/app/global-error.tsx
    - frontend/app/[locale]/error.tsx
  modified:
    - frontend/next.config.ts
    - frontend/messages/en.json
    - frontend/messages/zh.json
decisions:
  - "Global error boundary uses inline styles (no CSS framework) since it renders outside all layouts"
  - "Locale error boundary uses Tailwind classes since it renders inside NextIntlClientProvider"
  - "CSP includes unsafe-inline and unsafe-eval for Next.js compatibility"
metrics:
  duration: 2min
  completed: 2026-04-03
---

# Phase 25 Plan 03: Frontend Security Headers & Error Boundaries Summary

Security headers via next.config.ts async headers() function covering all 5 defense-in-depth headers; error boundaries with i18n support for locale pages and inline-styled fallback for root layout errors.

## What Was Done

### Task 1: Security Headers (cdcb675)

Added `securityHeaders` array and `async headers()` function to `next.config.ts`:
- **Strict-Transport-Security**: 2-year max-age with includeSubDomains
- **X-Frame-Options**: DENY (prevent clickjacking)
- **X-Content-Type-Options**: nosniff (prevent MIME sniffing)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Content-Security-Policy**: self-origin with Supabase connect-src allowlist

All headers apply to every route via `source: '/(.*)'`. Existing `withNextIntl` wrapper preserved.

### Task 2: Error Boundaries & i18n (a385339)

**global-error.tsx** — Root-level error boundary:
- Renders its own `<html>` and `<body>` tags (required since it replaces root layout)
- Uses inline styles with project design tokens (cream #faf9f5, text #2d2d2a, orange #d97757)
- Hardcoded English strings (cannot use useTranslations outside NextIntlClientProvider)
- Logs errors with `[UniBoard Global Error]` prefix including digest

**[locale]/error.tsx** — Locale-scoped error boundary:
- Uses `useTranslations('errorBoundary')` for i18n text
- Tailwind classes matching project design system (bg-cream, text-text-1, bg-orange)
- Logs errors with `[UniBoard Error]` prefix including digest

**i18n keys** added to both en.json and zh.json:
- `errorBoundary.title` / `errorBoundary.description` / `errorBoundary.retry`

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **CSP unsafe-inline/unsafe-eval**: Required for Next.js runtime script injection and styled-jsx; production tightening deferred to deployment phase
2. **Inline styles for global-error**: Since global-error.tsx renders outside all layouts (no Tailwind, no CSS modules loaded), inline styles are the only reliable approach

## Known Stubs

None - all components are fully functional with real data sources wired.

## Self-Check: PASSED
