// Phase 39 plan-1 — TDD RED gate for design-token CSS invariants.
//
// File-as-text vitest unit (idiom mirrored from
// __tests__/rsc/dashboard-prefetch.test.ts:217-230). Loads
// frontend/app/globals.css once at module scope and runs cheap regex
// assertions against the source. No DOM, no Tailwind compilation.
//
// Assertions enforce DESIGN-01 (oklch + hsl fallback + dark-mode
// reservation per CONTEXT.md D-03) and DESIGN-02 (8-point spacing
// scale). Brand-SSOT preservation (orange/blue/green hex unchanged) is
// also asserted because those tokens come from anthropics/skills/
// brand-guidelines and must not drift.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("Phase 39 color tokens (DESIGN-01)", () => {
  it("declares oklch values for at least 12 color tokens inside @theme", () => {
    // Catches the 12 brand+project tokens (6 base + 6 -soft variants)
    // plus the 9 neutrals — 21 total expected. Threshold is 12 to
    // tolerate future renames/removals of -soft helpers without
    // breaking the gate.
    const oklchTokens = source.match(/--color-[a-z0-9-]+:\s*oklch\(/g) ?? [];
    expect(oklchTokens.length).toBeGreaterThanOrEqual(12);
  });

  it("declares an @supports fallback block for browsers without oklch", () => {
    // Pitfall 3 (RESEARCH): the test value must be `oklch(0% 0 0)` — a
    // syntactically minimal but semantically valid oklch literal.
    // `oklch(0)` is parsed as a number and fails the @supports test
    // on Safari < 16.4 / Chrome < 111.
    expect(source).toMatch(
      /@supports\s+not\s+\(color:\s*oklch\(0%\s+0\s+0\)\)/,
    );
  });

  it("preserves brand SSOT hex literals inside the fallback block", () => {
    // Brand colors come from anthropics/skills/brand-guidelines (color
    // SSOT per CLAUDE.md). The hex/rgba fallbacks must never drift —
    // they encode the same visual identity for non-oklch browsers.
    expect(source).toMatch(/--color-orange:\s*#d97757/);
    expect(source).toMatch(/--color-blue:\s*#6a9bcc/);
    expect(source).toMatch(/--color-green:\s*#788c5d/);
  });

  it("includes empty [data-theme=\"dark\"] block for Phase 43 reservation (D-03)", () => {
    // Empty selector is intentional — Phase 43 fills the rule set.
    // The structural reservation keeps the selector parsable so future
    // overrides land cleanly without restructuring globals.css.
    expect(source).toMatch(/\[data-theme="dark"\]\s*\{/);
  });
});

describe("Phase 39 spacing scale (DESIGN-02)", () => {
  // Whitespace-tolerant regex per ISSUE-39-03 — the script-emitted
  // tokens may use varying indentation. `[[:space:]]+` accepts any
  // run of spaces or tabs.
  it.each([
    ["--spacing-1", "4px"],
    ["--spacing-2", "8px"],
    ["--spacing-3", "12px"],
    ["--spacing-4", "16px"],
    ["--spacing-6", "24px"],
    ["--spacing-8", "32px"],
    ["--spacing-12", "48px"],
    ["--spacing-16", "64px"],
  ] as const)("declares %s = %s", (token, value) => {
    const re = new RegExp(`${token}:\\s+${value.replace(".", "\\.")}\\b`);
    expect(source).toMatch(re);
  });

  it("preserves v2.0 layout tokens (sidebar-w / right-panel-w / header-h)", () => {
    // These tokens existed pre-Phase-39 and downstream components rely
    // on them. The plan-1 extension is additive; these MUST survive.
    expect(source).toMatch(/--spacing-sidebar-w:\s+68px/);
    expect(source).toMatch(/--spacing-sidebar-w-expanded:\s+224px/);
    expect(source).toMatch(/--spacing-right-panel-w:\s+300px/);
    expect(source).toMatch(/--spacing-header-h:\s+56px/);
  });

  it("preserves v2.0 shadow tokens unchanged (shadow-card / hover / dropdown)", () => {
    // Phase 39 plan-1 is additive — shadow tokens are out of scope and
    // must survive verbatim. Plan-3 may add motion-related tokens but
    // shadow tokens stay in plan-1's preservation contract.
    expect(source).toMatch(/--shadow-card:/);
    expect(source).toMatch(/--shadow-card-hover:/);
    expect(source).toMatch(/--shadow-dropdown:/);
  });
});
