---
status: issues_found
phase: 31-e2e-verification-ai-config
source: [31-VERIFICATION.md, user-report-2026-04-13]
started: 2026-04-06T07:00:00Z
updated: 2026-04-13T12:45:00Z
---

## Current Test

number: 4
name: Logout → re-login → navigation flow
awaiting: fix implementation

## Tests

### 1. Full E2E User Journey
expected: Register new account → setup Canvas/Ed tokens → sync triggers → real course data displayed in dashboard
result: pass (after 10 bug fixes in PRs #56-#68)

### 2. ANTHROPIC_API_KEY Production Check
expected: Railway dashboard shows ANTHROPIC_API_KEY set; AI health endpoint does not return 503
result: pass (user confirmed key set in Railway)

### 3. AI SSE Streaming
expected: Deadline Chat and Unit Review stream real AI responses in browser without CORS errors
result: [pending]

### 4. Logout → Re-login sends to /setup instead of Dashboard
expected: Previously registered user with configured tokens: logout → re-login → should enter dashboard directly
result: issue
reported: "logout后re-login进入了/setup页面，不是预期的dashboard"
severity: high
root_cause: |
  Race condition between AuthGuard.tsx Effect 3 and LoginForm.tsx onSuccess.
  1. signInWithPassword() triggers onAuthStateChange → setAuth(isAuthenticated:true)
  2. AuthGuard Effect 3 fires immediately: isAuthenticated=true + tokenConfigured=false → router.replace('/setup')
  3. LoginForm onSuccess never gets to run restoreTokenConfiguredIfNeeded() — AuthGuard already redirected
  Files: AuthGuard.tsx:52-56, LoginForm.tsx:38-40, store.ts:44-50

### 5. Browser back button after logout shows pre-logout page
expected: After logout, browser back button should NOT show any authenticated page
result: issue
reported: "点击返回按钮直接跳转到了logout前的页面"
severity: medium
root_cause: |
  Header.tsx:157 uses router.push('/auth') instead of router.replace('/auth').
  push() preserves pre-logout page in history stack.
  After AuthGuard replaces /auth with /setup, history is: [..., pre-logout-page, /setup].
  Back button → pre-logout page (briefly visible before DashboardGuard re-redirects).
  File: Header.tsx:157

## Summary

total: 5
passed: 2
issues: 2
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "已注册用户 logout 后 re-login 应直接进入 dashboard"
  status: failed
  reason: "AuthGuard race condition: Effect 3 reads stale tokenConfigured=false before restoreTokenConfiguredIfNeeded() completes"
  severity: high
  test: 4
  artifacts:
    - frontend/components/auth/AuthGuard.tsx
    - frontend/components/auth/LoginForm.tsx
    - frontend/lib/auth/store.ts
    - frontend/lib/auth/restore-token-status.ts
  fix:
    - "AuthGuard Effect 3: remove reactive redirect on isAuthenticated change; only redirect from session check"
    - "LoginForm: router.push → router.replace after login"

- truth: "Logout 后浏览器返回不应显示已认证页面"
  status: failed
  reason: "Header.tsx logout uses router.push instead of router.replace; pre-logout page stays in history"
  severity: medium
  test: 5
  artifacts:
    - frontend/components/layout/Header.tsx
    - frontend/components/setup/SuccessStep.tsx
  fix:
    - "Header.tsx: router.push → router.replace for logout navigation"
    - "Header.tsx: use useLogout hook (clears QueryClient) instead of inline signOut"
    - "SuccessStep.tsx: router.push → router.replace for dashboard navigation"
