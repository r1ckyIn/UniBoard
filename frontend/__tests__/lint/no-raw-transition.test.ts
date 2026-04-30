/**
 * Phase 39 plan-3 / plan-4 — sweep-completeness invariant for MOTION-01.
 *
 * In-process recursive walk over frontend/app and frontend/components
 * via node:fs (no shell spawning). Asserts zero matches for the two
 * raw transition utility forms blocked by the ESLint rule installed
 * in plan-3 task 2:
 *   shortcut form  /transition-(all|colors)\s+duration-[0-9]/
 *   bracket form   /transition-(all|colors)\s+duration-\[[^\]]+\]/
 *
 * Idiom analog: __tests__/rsc/dashboard-prefetch.test.ts:217-230 +
 * __tests__/rsc/prefetch-consumer-parity.test.ts:38-94 (multi-file
 * scan with readFileSync + regex per file).
 *
 * STATUS — STAYS RED at end of plan-3:
 *   Plan-3 lands the ESLint rule + tokens. There are still 56
 *   transition occurrences across 36 files in app/ + components/.
 *   Plan-4 runs the sed sweep + 6 manual edge-case edits and turns
 *   this test GREEN. Until then, this test fails — that is the plan-4
 *   completion gate.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(__dirname, "../..");
const SCAN_DIRS = ["app", "components"] as const;

function listSourceFiles(dir: string): string[] {
  // Recursive walk — includes .tsx and .ts files. node_modules and
  // .next are excluded by virtue of being outside SCAN_DIRS.
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      results.push(...listSourceFiles(p));
    } else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) {
      results.push(p);
    }
  }
  return results;
}

const allFiles = SCAN_DIRS.flatMap((d) => listSourceFiles(join(ROOT, d)));

describe("Phase 39 transition migration sweep complete (MOTION-01)", () => {
  it("zero transition-{all,colors} duration-NNN in app + components (shortcut form)", () => {
    const violations: string[] = [];
    const re = /transition-(all|colors)\s+duration-[0-9]/;
    for (const file of allFiles) {
      const src = readFileSync(file, "utf8");
      if (re.test(src)) {
        violations.push(file.replace(ROOT + "/", ""));
      }
    }
    expect(
      violations,
      `Files still containing raw transition-duration shortcut form:\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("zero transition-{all,colors} duration-[Xs] (bracket form per Pitfall 6)", () => {
    const violations: string[] = [];
    const re = /transition-(all|colors)\s+duration-\[[^\]]+\]/;
    for (const file of allFiles) {
      const src = readFileSync(file, "utf8");
      if (re.test(src)) {
        violations.push(file.replace(ROOT + "/", ""));
      }
    }
    expect(
      violations,
      `Files still containing bracket-form transition-duration:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
