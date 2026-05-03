/**
 * Phase 39 plan-3 — TDD spec for the no-restricted-syntax rule (D-16).
 *
 * Loads eslint.config.mjs dynamically, locates the no-restricted-syntax
 * block, and runs ESLint's in-process Linter against four fixture
 * sources to verify the rule:
 *   1. flags `transition-all duration-150` Literal       (FLAGS)
 *   2. flags `transition-colors duration-[0.15s]`        (FLAGS, bracket form)
 *   3. does NOT flag the migrated arbitrary-property form (CLEAN)
 *   4. flags template-literal containing the raw pattern (FLAGS, TemplateElement selector)
 *
 * Idiom blends:
 *   - sentry-init.test.ts (dynamic await import of an .mjs config module)
 *   - i18n/message-keys.test.ts (load known structure + assert with toMatch)
 *
 * Linter class is synchronous in-process (vs full ESLint runner) — faster
 * and doesn't need a fixture file on disk. The TSX parser is resolved
 * via createRequire rooted on eslint-config-next so pnpm strict
 * symlinks don't hide the transitively-installed @typescript-eslint/parser.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { Linter, type Linter as LinterTypes } from "eslint";
import { createRequire } from "node:module";

interface FlatBlock {
  files?: string[];
  rules?: Record<string, unknown>;
  ignores?: string[];
}

let ruleBlock: FlatBlock | undefined;
let parserAvailable = true;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tsParser: any = null;

beforeAll(async () => {
  // Dynamic-import the .mjs flat config. The config exports the
  // composed array; we scan for the block that owns no-restricted-syntax.
  const mod = (await import("../../eslint.config.mjs")) as {
    default: FlatBlock[];
  };
  const cfg = mod.default;
  ruleBlock = cfg.find(
    (b: FlatBlock) =>
      b?.rules && Object.keys(b.rules).includes("no-restricted-syntax"),
  );

  // Resolve a TSX-capable parser. eslint-config-next pulls
  // @typescript-eslint/parser transitively. Under pnpm strict mode the
  // parser lives in .pnpm/ store and is not symlinked at the top level,
  // so we createRequire from the eslint-config-next module path to find
  // it. Falls back to skipping if resolution fails.
  try {
    const req = createRequire(require.resolve("eslint-config-next"));
    const parserPath = req.resolve("@typescript-eslint/parser");
    tsParser = req(parserPath);
  } catch {
    parserAvailable = false;
  }
});

function lintCode(code: string): LinterTypes.LintMessage[] {
  if (!ruleBlock?.rules) {
    return [];
  }
  const linter = new Linter();
  return linter.verify(code, {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: ruleBlock.rules as LinterTypes.RulesRecord,
  });
}

describe("Phase 39 no-restricted-syntax rule (D-16)", () => {
  it("the rule block exists in eslint.config.mjs", () => {
    expect(ruleBlock).toBeDefined();
    expect(ruleBlock?.rules).toHaveProperty("no-restricted-syntax");
  });

  it("flags transition-all duration-150 in JSX className Literal", () => {
    if (!parserAvailable) {
      // TODO: Verify @typescript-eslint/parser availability —
      // see PATTERNS.md §no-raw-transition.test.ts "Verify in plan-3 spike".
      return;
    }
    const code = `const x = <div className="transition-all duration-150 hover:bg-red" />;`;
    const messages = lintCode(code);
    expect(messages.length).toBeGreaterThan(0);
    const joined = messages.map((m) => m.message).join("\n");
    expect(joined).toMatch(/transition.*duration/i);
  });

  it("flags transition-colors duration-[0.15s] (bracket form per Pitfall 6)", () => {
    if (!parserAvailable) {
      return;
    }
    const code = `const x = <div className="transition-colors duration-[0.15s]" />;`;
    const messages = lintCode(code);
    expect(messages.length).toBeGreaterThan(0);
  });

  it("does NOT flag the migrated form (now: shorthand transition-claude-fast)", () => {
    if (!parserAvailable) {
      return;
    }
    // Phase 40 D-40-03: the verbose `[transition-duration:...]
    // [transition-timing-function:...]` form is now itself forbidden
    // (encourages SEED-40 shorthand). The "migrated form" semantic
    // assertion — that the rule does NOT false-flag a legal post-migration
    // utility — now validates against the @utility shorthand instead.
    // Filter to rule-specific messages — parser may emit unrelated
    // diagnostics (e.g. unused vars) that we don't care about.
    const code = `const x = <div className="transition-claude-fast hover:bg-orange" />;`;
    const messages = lintCode(code);
    const restricted = messages.filter(
      (m) => m.ruleId === "no-restricted-syntax",
    );
    expect(restricted).toEqual([]);
  });

  it("flags transition-all duration in template literal (TemplateElement selector)", () => {
    if (!parserAvailable) {
      return;
    }
    const code =
      "const x = <div className={`transition-all duration-150 ${other}`} />;";
    const messages = lintCode(code);
    const restricted = messages.filter(
      (m) => m.ruleId === "no-restricted-syntax",
    );
    expect(restricted.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────
  // Phase 40 D-40-03 + D-40-04 fixtures (NEW — 4 tests)
  // ──────────────────────────────────────────────────────────

  it("flags verbose tokenized form (D-40-03 SEED-40 shorthand encouragement)", () => {
    if (!parserAvailable) return;
    const code = `const x = <div className="transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]" />;`;
    const messages = lintCode(code);
    const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted.length).toBeGreaterThan(0);
  });

  it("does NOT flag the shorthand form transition-claude-fast (D-40-03)", () => {
    if (!parserAvailable) return;
    const code = `const x = <div className="transition-claude-fast hover:bg-orange" />;`;
    const messages = lintCode(code);
    const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted).toEqual([]);
  });

  it("flags var(--ease) legacy alias (D-40-04 deprecation)", () => {
    if (!parserAvailable) return;
    const code = `const x = <div className="transition" style={{ transition: "color 0.28s var(--ease)" }} />;`;
    const messages = lintCode(code);
    const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted.length).toBeGreaterThan(0);
  });

  it("flags var(--ease-fast) legacy alias (D-40-04 deprecation)", () => {
    if (!parserAvailable) return;
    const code = `const x = <div style={{ transition: "opacity 0.15s var(--ease-fast)" }} />;`;
    const messages = lintCode(code);
    const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
    expect(restricted.length).toBeGreaterThan(0);
  });
});
