---
status: complete
phase: 03-frontend-dashboard
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-17T12:15:00Z
updated: 2026-03-17T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start — Frontend builds and starts
expected: Run `cd frontend && pnpm dev`. Server starts at http://localhost:3000 without errors. Opening http://localhost:3000 in browser redirects to /en/ (default locale).
result: pass

### 2. Paper Texture and Design System
expected: Page background shows subtle paper grain texture (faint noise) and horizontal ruled lines. Text headings use serif font (Source Serif 4), body text uses Inter sans-serif. Overall warm cream/beige color scheme.
result: pass

### 3. Sidebar Navigation
expected: Left sidebar shows 7 icon-only nav items (68px wide). Hovering over sidebar expands it to 224px showing text labels (Dashboard, Timetable, Courses, Deadlines, Predict, Digest, Settings). Active page icon has orange-tinted background. Orange "U" logo at top.
result: pass

### 4. Login Page
expected: Navigate to /en/login. Split-screen layout: left side shows UniBoard branding with orange logo and tagline "Your GPA, Maximized", right side shows login form with Email and Password fields. Hand-drawn card border visible around form.
result: pass

### 5. Register Page
expected: Navigate to /en/register. Same split-screen layout as login. Form has Display Name, Email, Password, Confirm Password fields. Submit button is orange.
result: pass

### 6. Onboarding Flow
expected: After registering (or navigating to /en/setup), 3-step onboarding shows: Step 1 welcome message, Step 2 token tutorial with Canvas and Ed instructions, Step 3 token paste fields for both platforms with "Validate & Connect" button.
result: pass

### 7. Dashboard Hero Section
expected: Dashboard page (/) shows full-viewport-height hero section with greeting ("Good morning/afternoon/evening"), current date, and "your dashboard" scroll prompt at bottom with breathing animation. Hand-drawn text annotations (underlines, circles) appear with staggered animation.
result: pass

### 8. Dashboard Below-fold Data
expected: Scrolling past the hero reveals: stats row (Current WAM, Target, Alerts cards), course grades table with progress bars and grade band badges (HD/D/CR/P/F in distinct colors), deadline timeline, and assessment weight donut chart.
result: pass

### 9. Courses Page
expected: Navigate to Courses via sidebar. Grid of course cards showing course code, name, WAM number, progress bar for % assessed, and colored grade band badge. Cards are clickable.
result: pass
reported: "No backend running, shows 4 gray skeleton placeholders (loading state). UI structure correct."

### 10. Deadlines Calendar + Timeline
expected: Navigate to Deadlines via sidebar. Month calendar grid at top with day cells and left/right arrow navigation. Below: filterable deadline list with urgency color coding (red border = urgent, amber = warning). Clicking a calendar day filters the list to that day.
result: pass

### 11. Predict — What-if Simulator
expected: Navigate to Predict via sidebar. "What-if Simulator" heading visible. Expandable course sections with assessment sliders. Moving a slider (or typing a number) updates the "Simulated WAM" number at the top in real-time without any loading indicator. Current WAM → Simulated WAM shown with arrow.
result: pass
reported: "No backend — shows error state 'Failed to load GPA data'. Correct degradation: simulator requires course data to render sliders."

### 12. Settings — Token Management
expected: Navigate to Settings via sidebar. Four sections visible: Token Management (Canvas and Ed with status badges), GPA Target (number input with grade band preview), Course Linking, User Profile. Token fields show monospace password input with status indicator.
result: pass

### 13. i18n Locale Switching
expected: Change URL from /en/ to /zh/. All navigation labels and UI text switch to Chinese. Switching back to /en/ restores English.
result: issue
reported: "侧边栏导航标签切换为中文，但页面内容（Settings标题、API Tokens、GPA Target等）仍显示英文"
severity: minor

### 14. Timetable Placeholder
expected: Navigate to Timetable via sidebar. Shows "Coming Soon" message with Calendar icon centered on page.
result: pass

## Summary

total: 14
passed: 13
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "All UI text switches to Chinese when URL changes to /zh/"
  status: failed
  reason: "User reported: sidebar nav labels switch to Chinese correctly, but page content (Settings title, API Tokens, GPA Target, etc.) remains in English"
  severity: minor
  test: 13
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
