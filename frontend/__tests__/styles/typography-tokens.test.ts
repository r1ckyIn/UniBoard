/**
 * Phase 39 plan-2 — TYPO-01 typography token assertions.
 *
 * File-as-text vitest unit (idiom mirrored from
 * __tests__/styles/tokens-css.test.ts and __tests__/rsc/
 * dashboard-prefetch.test.ts:217-230). Loads frontend/app/globals.css
 * once at module scope and runs cheap regex assertions against the
 * source. No DOM, no Tailwind compilation.
 *
 * Per RESEARCH §Q1 correction: Tailwind v4 namespaces are
 *   --text-*    -> text-{name} font-size utility
 *   --leading-* -> leading-{name} line-height utility
 *   --tracking-*-> tracking-{name} letter-spacing utility
 * NOT CONTEXT.md D-06's --font-size-* / --line-height-* /
 * --letter-spacing-* (which compile but generate zero utilities — see
 * RESEARCH §Pitfall 4).
 *
 * Sizes (D-06 distilled from v2.0 prototype scale @ html font-size 15px):
 *   hero    2.8rem   (42px)   leading 1.15  tracking -0.02em
 *   section 1.5rem   (22.5px) leading 1.3   tracking -0.02em
 *   body    0.95rem  (14.25px) leading 1.5  tracking — (browser default)
 *   caption 0.74rem  (11.1px) leading 1.4   tracking +0.06em
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("Phase 39 typography tokens (TYPO-01)", () => {
  // Per RESEARCH Q1 correction — Tailwind v4 namespaces are
  // --text-*/--leading-*/--tracking-*, NOT D-06's --font-size-*/
  // --line-height-*/--letter-spacing-*. Names must match the v4
  // namespace registry to generate text-hero / leading-hero /
  // tracking-hero utilities.
  const TIERS = ["hero", "section", "body", "caption"] as const;

  it.each(TIERS)("declares --text-%s font-size token", (tier) => {
    expect(source).toMatch(new RegExp(`--text-${tier}:\\s*[\\d.]+rem`));
  });

  it.each(TIERS)("declares --leading-%s line-height token", (tier) => {
    // body may omit tracking but all four MUST have leading.
    expect(source).toMatch(new RegExp(`--leading-${tier}:\\s*[\\d.]+`));
  });

  it("hero + section have negative tracking (-0.02em per D-06)", () => {
    expect(source).toMatch(/--tracking-hero:\s*-0\.02em/);
    expect(source).toMatch(/--tracking-section:\s*-0\.02em/);
  });

  it("caption has +0.06em tracking (uppercase rhythm per D-06)", () => {
    expect(source).toMatch(/--tracking-caption:\s*0\.06em/);
  });

  it("hero size = 2.8rem, section = 1.5rem, body = 0.95rem, caption = 0.74rem", () => {
    // Resolves to v2.0 px exactly at html { font-size: 15px }.
    expect(source).toMatch(/--text-hero:\s*2\.8rem/);
    expect(source).toMatch(/--text-section:\s*1\.5rem/);
    expect(source).toMatch(/--text-body:\s*0\.95rem/);
    expect(source).toMatch(/--text-caption:\s*0\.74rem/);
  });
});
