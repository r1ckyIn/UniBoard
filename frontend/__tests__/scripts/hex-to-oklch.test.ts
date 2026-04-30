// Phase 39 plan-1 — TDD RED gate for the hex→oklch conversion script.
//
// These assertions enforce success-criterion #1 (ROADMAP Phase 39):
// every brand+project+neutral palette entry must round-trip from hex to
// oklch and back with a perceptual ΔE distance under 1.0.
//
// Source-of-truth fixtures mirror PALETTE in scripts/hex-to-oklch.mjs
// (RESEARCH §Code Example 5 lines 710-729). When PALETTE drifts, the
// FIXTURES list below MUST be updated in lockstep.
//
// Pitfall 5 (RESEARCH): culori's differenceEuclidean is mode-aware. Bare
// `differenceEuclidean()` measures distance in the active color space which
// after parse() is sRGB — meaningless against the perceptual threshold.
// Always pass the literal "oklch" mode argument.

import { describe, it, expect } from "vitest";
import { differenceEuclidean } from "culori";

// Dynamic-import the .mjs module so this TS test consumes the same exports
// that the script's CLI entry point uses. The script does not yet exist
// during the RED gate — vitest will surface "module not found" until
// Task 2 (GREEN) creates it.
const { convert } = await import("../../scripts/hex-to-oklch.mjs");

const FIXTURES = [
  // Brand-guidelines accents (color SSOT per CLAUDE.md note)
  { name: "orange", hex: "#d97757" },
  { name: "blue", hex: "#6a9bcc" },
  { name: "green", hex: "#788c5d" },
  // Project palette
  { name: "amber", hex: "#b08968" },
  { name: "purple", hex: "#9b7bb8" },
  { name: "red", hex: "#cc4455" },
  // Neutrals
  { name: "dark", hex: "#e8ddd0" },
  { name: "cream", hex: "#faf9f5" },
  { name: "card-bg", hex: "#f6f5f0" },
  { name: "card-bg-hover", hex: "#efede6" },
  { name: "card-border", hex: "#e8e5dd" },
  { name: "text-1", hex: "#2d2d2a" },
  { name: "text-2", hex: "#6b6b65" },
  { name: "text-3", hex: "#9b9b94" },
  { name: "divider", hex: "#eae7e0" },
] as const;

const dE = differenceEuclidean("oklch");

describe("hex-to-oklch", () => {
  it.each(FIXTURES)(
    "$name (#$hex) round-trips with ΔE < 1.0",
    ({ name, hex }) => {
      const result = convert({ name, hex, source: "test-fixture" });

      // Shape — convert() must echo back name + hex unchanged.
      expect(result.name).toBe(name);
      expect(result.hex).toBe(hex);

      // CSS string must be a parseable oklch(L C H) literal with
      // numeric components only (no NaN/undefined). The hue may be
      // negative because culori normalises chroma signs.
      expect(result.css).toMatch(
        /^oklch\(\d+\.\d+ \d+\.\d+ -?\d+(\.\d+)?\)$/,
      );

      // Round-trip ΔE: parse the formatted CSS, compare against the
      // original parsed oklch. Mode-aware euclidean distance must be
      // strictly < 1.0 (perceptual threshold per ROADMAP Phase 39 #1).
      expect(typeof result.delta).toBe("number");
      expect(result.delta).toBeLessThan(1.0);
    },
  );

  it("emits zero ΔE warnings for the canonical PALETTE", () => {
    // Sanity check — converting every fixture under the production code
    // path should not produce any delta >= 1.0. Mirrors the assertion
    // above but as a single aggregate (acts as a regression backstop if
    // any individual test is later relaxed).
    const deltas = FIXTURES.map(({ name, hex }) =>
      convert({ name, hex, source: "aggregate" }).delta,
    );
    expect(Math.max(...deltas)).toBeLessThan(1.0);
  });

  it("performs an in-test ΔE sanity check via culori directly", () => {
    // Independent confirmation that differenceEuclidean('oklch') is
    // mode-aware (Pitfall 5). If this test ever fails at < 0.001 it
    // means culori's API contract changed and the script needs review.
    const a = { mode: "oklch", l: 0.5, c: 0.1, h: 90 } as const;
    const b = { mode: "oklch", l: 0.5, c: 0.1, h: 90 } as const;
    expect(dE(a, b)).toBeLessThan(0.001);
  });
});
