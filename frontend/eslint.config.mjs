import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
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
