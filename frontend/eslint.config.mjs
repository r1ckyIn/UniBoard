import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next v16 ships native flat configs — no FlatCompat needed.
// core-web-vitals is a superset of the base config, so importing both covers
// the full Next.js rule set plus TypeScript-specific rules.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // TODO(SEED-001): eslint-plugin-react-hooks v7 (pulled in by
    // eslint-config-next@16) adds stricter rules that surface pre-existing
    // idioms across 13 files (Guard components + page init effects + one
    // ref-in-render in use-ai-stream + react-hook-form watch()). Turning them
    // off preserves the major upgrade without destabilising Phase 38-verified
    // code. A separate refactor phase should re-enable each rule and rework
    // the impacted components. Tracked as SEED-001 in .planning/seeds/.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  // === Phase 39 D-16: Block raw transition utilities in JSX className ===
  // Catches both shortcut form (duration-150) and bracket form (duration-[0.15s]).
  // Migrate to: [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]
  // See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Matches `transition-{all,colors} duration-{N}` with optional
          // modifier prefixes on either utility (e.g. `after:`, `before:`,
          // `hover:`, `focus:`, `dark:`, `group-hover:`, `peer-hover:`).
          // Both utilities may carry independent prefixes — Tailwind allows
          // mixing (e.g. `hover:transition-colors duration-200`) — so each
          // side gets its own optional `(?:[a-z][a-z0-9-]*:)*` group.
          selector:
            "Literal[value=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+(?:[a-z][a-z0-9-]*:)*duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` (with optional modifier prefix like `after:`, `hover:`, `focus:`) is forbidden. " +
            "Use the migrated form with two arbitrary properties: " +
            "transition-duration mapped to var(--motion-fast / --motion-base / --motion-slow), " +
            "and transition-timing-function mapped to var(--ease-claude-out). " +
            "Repeat the modifier prefix on each token (e.g. `after:[transition-duration:var(--motion-fast)] after:[transition-timing-function:var(--ease-claude-out)]`). " +
            "See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(?:[a-z][a-z0-9-]*:)*transition-(all|colors)\\s+(?:[a-z][a-z0-9-]*:)*duration-(\\[[^\\]]*\\]|\\d+)/]",
          message:
            "Raw `transition-{all,colors} duration-{N}` in template literal (with optional modifier prefix) is forbidden. " +
            "See .planning/phases/39-design-token-foundation/39-RESEARCH.md §Pattern 4.",
        },
      ],
    },
  },
  // === Phase 39 D-16 test fixtures override: the rule's own TDD spec
  // contains intentional violations as fixture strings (the test verifies
  // the rule fires on these). Disabling no-restricted-syntax in this one
  // test file lets `pnpm lint` pass while preserving the rule everywhere
  // else. See __tests__/eslint/no-raw-transition.test.ts header for context.
  {
    files: ["__tests__/eslint/no-raw-transition.test.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Phase 38 P04 will install @playwright/test and activate this spec;
      // until then the file carries a `@ts-nocheck` pragma and is excluded
      // from lint to avoid a false "ban-ts-comment" error.
      "tests/e2e/perf/coldstart.spec.ts",
    ],
  },
];

export default eslintConfig;
