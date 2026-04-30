/**
 * Phase 39 plan-3 — DESIGN-03 motion timing token assertions.
 *
 * File-as-text vitest unit (idiom mirrored from
 * __tests__/styles/tokens-css.test.ts and typography-tokens.test.ts).
 * Loads frontend/app/globals.css once at module scope and runs cheap
 * regex assertions against the source. No DOM, no Tailwind compilation.
 *
 * Per CONTEXT.md D-13:
 *   --motion-fast: 150ms  (hover/focus feedback, color/opacity micro-transitions)
 *   --motion-base: 250ms  (layout shifts, dropdown drop-in, sidebar expand)
 *   --motion-slow: 400ms  (page-level entries, hero animations)
 *   --ease-claude-out: cubic-bezier(0.165, 0.85, 0.45, 1)  (v3.0 brand spec)
 *
 * Per CONTEXT.md D-14: v2.0 legacy --ease and --ease-fast aliases must be
 * preserved (or installed alongside) so the existing 50+ call sites keep
 * their visual rhythm.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("Phase 39 motion tokens (DESIGN-03)", () => {
  it("declares --motion-fast: 150ms", () => {
    expect(source).toMatch(/--motion-fast:\s*150ms/);
  });

  it("declares --motion-base: 250ms", () => {
    expect(source).toMatch(/--motion-base:\s*250ms/);
  });

  it("declares --motion-slow: 400ms", () => {
    expect(source).toMatch(/--motion-slow:\s*400ms/);
  });

  it("declares --ease-claude-out cubic-bezier per v3.0 brand spec", () => {
    // Escape the parentheses in the cubic-bezier signature so the regex
    // matches the literal characters, not capture groups.
    expect(source).toMatch(
      /--ease-claude-out:\s*cubic-bezier\(0\.165,\s*0\.85,\s*0\.45,\s*1\)/,
    );
  });

  it("preserves v2.0 legacy --ease + --ease-fast aliases (D-14)", () => {
    // Phase 40 SHARED-01 will deprecate; Phase 39 only adds the new
    // tokens and keeps the legacy aliases alive so v2.0 components
    // referencing var(--ease) / var(--ease-fast) keep their rhythm.
    expect(source).toMatch(/--ease:\s*0\.28s/);
    expect(source).toMatch(/--ease-fast:\s*0\.15s/);
  });
});
