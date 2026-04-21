// Phase 38.1 static-invariant test — closes Phase 38 HUMAN-UAT Truth #2.
//
// Contract: every React `use[A-Z]...` hook (and every inlined queryOptions
// factory call such as `useQueries({ queries: [...factory.detail(id)] })`)
// invoked in a `force-dynamic` dashboard page's top-level consumer component
// MUST be either:
//   (a) mapped to a queryOptions factory that appears textually in the
//       corresponding server-side page.tsx (prefetch parity), OR
//   (b) listed in MUTATION_HOOKS (non-query — exempt from prefetch), OR
//   (c) listed in IGNORED_HOOKS (React stdlib, next-intl, TanStack helpers).
//
// Generalises the 1-page static-regex check in dashboard-prefetch.test.ts
// (lines 196-209) across all 6 `force-dynamic` dashboard pages.
//
// Maintenance surface (PATTERNS.md §7 design note 2): when a new query hook
// is added to hooks/use-*.ts and consumed by a force-dynamic page, extend
// HOOK_TO_FACTORY. When a new mutation/disabled-query hook is added, extend
// MUTATION_HOOKS. The audit test at the bottom fails if a consumer invokes
// a `use[A-Z]...` symbol absent from all three allowlists.
//
// Deviation from PATTERNS.md §7 (Rule 2 — correctness requirement):
//   1. `pageSource` has JS comments stripped before the factory `.includes()`
//      check. Without this, Timetable's top-of-file comment that references
//      `courseOptions.detail(c.id)` (page.tsx:L11) would make a naive
//      `pageSource.includes("courseOptions.detail")` return true — producing
//      a false-positive GREEN on the RED-state contract for Timetable.
//   2. Consumer scan augmented with a factory-reverse scan: if a consumer
//      references `xxxOptions.yyy(` inline (e.g., `useQueries({ queries:
//      courses.map((c) => courseOptions.detail(c.id)) })`), we reverse-map
//      via FACTORY_TO_HOOK and treat the corresponding hook name as consumed.
//      Required for Timetable + Predict to correctly flag missing
//      `courseOptions.detail` prefetches — the plan's RED-state contract
//      demands `useCourseDetail (expected prefetch via courseOptions.detail)`
//      appear in the failure message, but neither consumer calls
//      `useCourseDetail()` directly (both inline `courseOptions.detail` via
//      `useQueries`).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PAGES: Array<{
  name: string;
  pagePath: string;
  consumers: string[];
}> = [
  {
    name: "dashboard",
    pagePath: "../../app/[locale]/(dashboard)/page.tsx",
    consumers: ["../../components/dashboard/DashboardPage.tsx"],
  },
  {
    name: "courses",
    pagePath: "../../app/[locale]/(dashboard)/courses/page.tsx",
    consumers: ["../../components/courses/CoursesPage.tsx"],
  },
  {
    name: "deadlines",
    pagePath: "../../app/[locale]/(dashboard)/deadlines/page.tsx",
    consumers: ["../../components/deadlines/DeadlinesPage.tsx"],
  },
  {
    name: "predict",
    pagePath: "../../app/[locale]/(dashboard)/predict/page.tsx",
    consumers: ["../../components/predict/PredictPage.tsx"],
  },
  {
    name: "digest",
    pagePath: "../../app/[locale]/(dashboard)/digest/page.tsx",
    consumers: ["../../components/digest/DigestPage.tsx"],
  },
  {
    name: "timetable",
    pagePath: "../../app/[locale]/(dashboard)/timetable/page.tsx",
    consumers: ["../../components/timetable/TimetablePage.tsx"],
  },
];

// Data-query hooks (prefetched via the listed factory). Load-bearing —
// keep byte-aligned with hooks/use-*.ts factory names.
const HOOK_TO_FACTORY: Record<string, string> = {
  useCourses: "courseOptions.list",
  useCourseDetail: "courseOptions.detail",
  useDeadlines: "deadlineOptions.list",
  useUpcomingDeadlines: "deadlineOptions.upcoming",
  useGpaReport: "gpaOptions.report",
  useStudyRecommendation: "studyRecOptions.latest",
  useCurrentUser: "userOptions.me",
  useNotifications: "notificationOptions.list",
  useAlerts: "alertOptions.list",
  useDigestLatest: "digestOptions.latest",
  useDigestHistory: "digestOptions.history",
  useTimetableSessions: "timetableOptions.sessions",
  useSemesterWeeks: "timetableOptions.weeks",
};

// Inverse of HOOK_TO_FACTORY — used to reverse-resolve inlined factory
// calls in consumers (e.g. `useQueries({ queries: [courseOptions.detail(id)] })`)
// back to their hook name for the missing-prefetch error message.
const FACTORY_TO_HOOK: Record<string, string> = Object.fromEntries(
  Object.entries(HOOK_TO_FACTORY).map(([hook, factory]) => [factory, hook]),
);

// Mutation + disabled-query hooks (never prefetched on server).
const MUTATION_HOOKS = new Set([
  "useMultiCoursePath",
  "useLogout",
  "useUpdateProfile",
  "useConfigureToken",
  "useVerifyToken",
  "useDeleteToken",
  "useDeleteAccount",
  "useCreateDeadlineAction",
  "useRemoveDeadlineAction",
  "useExportData",
]);

// Matches React-style hook invocations: useWord(. Excludes `useState`
// etc. implicitly via HOOK_TO_FACTORY + MUTATION_HOOKS + IGNORED_HOOKS
// allowlisting.
const HOOK_CALL_REGEX = /\b(use[A-Z][a-zA-Z0-9_]*)\s*\(/g;

// Matches inlined queryOptions-factory calls: xxxOptions.yyy(. Used to
// detect consumers that embed factories inside helpers like `useQueries`.
const FACTORY_CALL_REGEX = /\b([a-z][a-zA-Z0-9_]*Options\.[a-zA-Z0-9_]+)\s*\(/g;

// React stdlib + next-intl + custom non-data hooks that must be ignored
// during the parity check (not in HOOK_TO_FACTORY, not in MUTATION_HOOKS,
// but legitimate hook calls — regex must not flag them).
const IGNORED_HOOKS = new Set([
  "useState",
  "useEffect",
  "useRef",
  "useMemo",
  "useCallback",
  "useReducer",
  "useContext",
  "useLayoutEffect",
  "useTransition",
  "useDeferredValue",
  "useId",
  "useSyncExternalStore",
  "useImperativeHandle",
  "useDebugValue",
  "useInsertionEffect",
  "useTranslations",
  "useLocale",
  "useRouter",
  "useSearchParams",
  "usePathname",
  "useParams",
  "useFormatter",
  "useNow",
  "useTimeZone",
  "useMessages",
  "useOptimistic",
  "useActionState",
  "useFormStatus",
  "useFormState",
  "useQueryClient", // TanStack — client helper, not a query
  "useAuthStore", // zustand selector helper — not a data query
  "useQueries", // TanStack — prefetch target is the inner factory (courseOptions.detail for timetable/predict)
  "useCountUp", // custom animation hook — no data
]);

/**
 * Strip `/* ... *\/` block comments and `// ...` line comments from source
 * before checking for factory references. Without this, a comment that
 * mentions a factory name (e.g. Timetable page.tsx:L11 documents the
 * `useQueries on courseOptions.detail(c.id)` pattern in a header comment)
 * would falsely satisfy `pageSource.includes("courseOptions.detail")` and
 * mask a real missing prefetch. This is a simple textual strip — it does
 * NOT parse TypeScript, it only removes literal comment spans.
 */
function stripComments(source: string): string {
  // Strip /* ... */ block comments (non-greedy, multiline).
  let out = source.replace(/\/\*[\s\S]*?\*\//g, "");
  // Strip // line comments (preserve line boundaries so row positions shift
  // as little as possible for future debugging ergonomics).
  out = out.replace(/^[\s]*\/\/.*$/gm, "");
  return out;
}

describe("Server-prefetch ↔ client-consumer parity (Phase 38.1 invariant)", () => {
  for (const { name, pagePath, consumers } of PAGES) {
    it(`${name}: every client useQuery hook is prefetched on the server`, () => {
      const pageSource = stripComments(
        readFileSync(resolve(__dirname, pagePath), "utf8"),
      );

      const consumerHooks = new Set<string>();
      for (const consumerPath of consumers) {
        const rawSrc = readFileSync(resolve(__dirname, consumerPath), "utf8");
        const src = stripComments(rawSrc);

        // Pass 1: direct `use[A-Z]...` hook invocations.
        for (const m of src.matchAll(HOOK_CALL_REGEX)) {
          const hookName = m[1];
          if (IGNORED_HOOKS.has(hookName)) continue;
          if (MUTATION_HOOKS.has(hookName)) continue;
          if (!(hookName in HOOK_TO_FACTORY)) continue;
          consumerHooks.add(hookName);
        }

        // Pass 2: inlined factory calls (e.g. `useQueries` fanout). Reverse
        // map `xxxOptions.yyy` -> hook name so the missing-prefetch error
        // message uses the hook identifier the developer recognises.
        for (const m of src.matchAll(FACTORY_CALL_REGEX)) {
          const factory = m[1];
          const hook = FACTORY_TO_HOOK[factory];
          if (!hook) continue;
          consumerHooks.add(hook);
        }
      }

      const missing: string[] = [];
      for (const hook of consumerHooks) {
        const factory = HOOK_TO_FACTORY[hook];
        if (!pageSource.includes(factory)) {
          missing.push(`${hook} (expected prefetch via ${factory})`);
        }
      }

      expect(
        missing,
        `${name} page.tsx has unprefetched consumers: ${missing.join(", ")}`,
      ).toEqual([]);
    });
  }

  it("every consumer hook is either in HOOK_TO_FACTORY or MUTATION_HOOKS or IGNORED_HOOKS (no unknown bucket)", () => {
    // Guards the mapping table against silent drift. If a consumer
    // introduces a new `use...` symbol that is none of the above, this
    // fails — forcing the dev to either map it (HOOK_TO_FACTORY),
    // allowlist it (MUTATION_HOOKS), or mark it as non-data (IGNORED_HOOKS).
    const unknownHooks = new Set<string>();
    for (const { consumers } of PAGES) {
      for (const consumerPath of consumers) {
        const src = stripComments(
          readFileSync(resolve(__dirname, consumerPath), "utf8"),
        );
        for (const m of src.matchAll(HOOK_CALL_REGEX)) {
          const hookName = m[1];
          if (IGNORED_HOOKS.has(hookName)) continue;
          if (MUTATION_HOOKS.has(hookName)) continue;
          if (hookName in HOOK_TO_FACTORY) continue;
          unknownHooks.add(hookName);
        }
      }
    }

    expect(
      Array.from(unknownHooks).sort(),
      `unmapped hooks found (add to HOOK_TO_FACTORY, MUTATION_HOOKS, or IGNORED_HOOKS): ${Array.from(unknownHooks).join(", ")}`,
    ).toEqual([]);
  });

  it("dashboard page.tsx has at most 2 awaited fetchQuery calls (PERF-02 waterfall collapse, preserved from dashboard-prefetch.test.ts)", () => {
    const pagePath = resolve(
      __dirname,
      "../../app/[locale]/(dashboard)/page.tsx",
    );
    const source = readFileSync(pagePath, "utf8");
    const matches = source.match(/await[^\n]*?\.fetchQuery\b/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});
