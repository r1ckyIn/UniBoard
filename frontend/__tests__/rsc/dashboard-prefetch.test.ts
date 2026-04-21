import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Module mocks (hoisted) ───────────────────────────────────────────────
const mockGetSession = vi.fn();
const mockCaptureException = vi.fn();
const mockKyGet = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => {
      if (name === "host") return "localhost:3001";
      if (name === "x-forwarded-proto") return "http";
      return null;
    },
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

// Stub the server API client — the unit under test MUST route all network
// traffic through getServerApiClient so no real HTTP happens.
vi.mock("@/lib/rsc/server-query-fn", () => ({
  getServerApiClient: vi.fn().mockResolvedValue({
    get: (path: string) => ({
      json: () => mockKyGet(path),
    }),
  }),
}));

// Stub DashboardPage — not under test here.
vi.mock("@/components/dashboard/DashboardPage", () => ({
  default: () => null,
}));

const isServerFlag = { value: true };
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    get isServer() {
      return isServerFlag.value;
    },
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────
const coursesFixture = {
  data: [
    { id: "crs_aaa", code: "COMP2017", name: "Systems" },
    { id: "crs_bbb", code: "COMP2123", name: "Data Structures" },
  ],
};

const deadlinesFixture = {
  data: [
    {
      id: "d1",
      title: "Assignment 1",
      course_code: "COMP2123",
      days_remaining: 3,
    },
    {
      id: "d2",
      title: "Quiz",
      course_code: "COMP2017",
      days_remaining: 7,
    },
  ],
};

const gpaFixture = { data: { gpa: 3.7 } };
const studyRecFixture = { data: { text: "Focus on A1" } };
const courseDetailFixture = {
  data: {
    id: "crs_bbb",
    code: "COMP2123",
    assessment_weights: [],
  },
};

// Phase 38.1 parity fixtures — Dashboard's Wave A now also prefetches
// useCurrentUser / useNotifications / useAlerts. Shapes only need to satisfy
// the `.json<T>()` call — deep field contracts are validated elsewhere.
const userMeFixture = {
  data: { id: "u1", email: "t@e.com", full_name: "Test" },
};
const notificationsFixture = { data: [] };
const alertsFixture = { data: [] };

// ── Tests ────────────────────────────────────────────────────────────────
describe("Dashboard RSC prefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isServerFlag.value = true;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "u1" },
          access_token: "t1",
        },
      },
    });

    // Default ky responses — each test may override.
    mockKyGet.mockImplementation(async (path: string) => {
      if (path === "courses") return coursesFixture;
      if (path === "deadlines/upcoming") return deadlinesFixture;
      if (path === "gpa") return gpaFixture;
      if (path === "ai/study-recommendations") return studyRecFixture;
      // Phase 38.1 additions — Dashboard now also prefetches
      // useCurrentUser / useNotifications / useAlerts so the mock must
      // answer these paths or the Wave A prefetches throw and pollute the
      // test assertions (even though wrapSentry catches them).
      if (path === "users/me") return userMeFixture;
      if (path === "notifications") return notificationsFixture;
      if (path === "alerts") return alertsFixture;
      if (path.startsWith("courses/")) return courseDetailFixture;
      throw new Error(`Unexpected path: ${path}`);
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("prefetches the nearest-course detail (COMP2123 = crs_bbb) after awaiting /deadlines/upcoming", async () => {
    // Render the Page with params resolved to zh-CN.
    const { default: Page } = await import(
      "@/app/[locale]/(dashboard)/page"
    );
    const result = (await Page({
      params: Promise.resolve({ locale: "zh-CN" }),
    })) as { props: { state: unknown } };

    expect(result).not.toBeNull();

    // Paths that must have been requested — nearest course detail included.
    const paths = mockKyGet.mock.calls.map((c) => c[0]);
    expect(paths).toContain("courses");
    expect(paths).toContain("deadlines/upcoming");
    expect(paths).toContain("gpa");
    expect(paths).toContain("ai/study-recommendations");
    expect(paths).toContain("courses/crs_bbb");

    // Dehydrated state must exist (HydrationBoundary wraps children).
    expect(result.props.state).toBeDefined();
    const state = result.props.state as { queries?: Array<unknown> };
    expect(Array.isArray(state.queries)).toBe(true);
    expect(state.queries!.length).toBeGreaterThanOrEqual(4);
  });

  it("still renders a HydrationBoundary when /deadlines/upcoming rejects; Sentry notified; course-detail NOT prefetched", async () => {
    mockKyGet.mockImplementation(async (path: string) => {
      if (path === "deadlines/upcoming") throw new Error("upstream down");
      if (path === "courses") return coursesFixture;
      if (path === "gpa") return gpaFixture;
      if (path === "ai/study-recommendations") return studyRecFixture;
      // Phase 38.1 parity additions — keep failure-path stubs in sync with
      // the default mock so Wave A prefetches don't throw unrelated errors.
      if (path === "users/me") return userMeFixture;
      if (path === "notifications") return notificationsFixture;
      if (path === "alerts") return alertsFixture;
      if (path.startsWith("courses/")) return courseDetailFixture;
      throw new Error(`Unexpected path: ${path}`);
    });

    const { default: Page } = await import(
      "@/app/[locale]/(dashboard)/page"
    );
    const result = (await Page({
      params: Promise.resolve({ locale: "zh-CN" }),
    })) as { props: { state: unknown } };

    expect(result).not.toBeNull();

    // courses/crs_bbb MUST NOT have been requested because deadlines failed
    // (nearest-course id cannot be derived).
    const paths = mockKyGet.mock.calls.map((c) => c[0]);
    expect(paths).not.toContain("courses/crs_bbb");

    // Sentry called at least once — one of them tagged for the deadlines
    // failure (either via wrapSentry on the awaited fetchQuery catch, or via
    // QueryCache onError).
    expect(mockCaptureException).toHaveBeenCalled();
    const hasDeadlinesTag = mockCaptureException.mock.calls.some(([, ctx]) => {
      const t = (ctx as { tags?: { query?: string } } | undefined)?.tags;
      return (
        t?.query === "deadlines-upcoming" ||
        t?.query === "deadlines"
      );
    });
    expect(hasDeadlinesTag).toBe(true);
  });

  it("static analysis: dashboard page.tsx has at most 2 awaited fetchQuery calls (PERF-02 waterfall collapse)", () => {
    const pagePath = resolve(
      __dirname,
      "../../app/[locale]/(dashboard)/page.tsx",
    );
    const source = readFileSync(pagePath, "utf8");
    // Match only the `.fetchQuery(` method shape — the literal `.` before
    // `fetchQuery` excludes `.prefetchQuery` (which is `.pre` + `fetchQuery`),
    // and `\b` ensures `fetchQuery` is a standalone identifier. Without these
    // guards, `await queryClient.prefetchQuery(...)` would be false-counted
    // as a blocking fetch call (WR-02).
    const matches = source.match(/await[^\n]*?\.fetchQuery\b/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(2);
  });
});
