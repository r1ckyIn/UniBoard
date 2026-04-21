import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";

// ── Module mocks (hoisted by vitest) ───────────────────────────────────────
const mockGetSession = vi.fn();
const mockCaptureException = vi.fn();

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

// Server factory is pure; use the real one to validate dehydrate integration.
// Mock isServer to true so the factory doesn't throw in jsdom.
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

// ── Tests ──────────────────────────────────────────────────────────────────
describe("createPrefetchedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isServerFlag.value = true;
  });

  it("calls run with { queryClient, accessToken, userId } and returns a HydrationBoundary wrapping children on a valid session", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "u1" },
          access_token: "t1",
        },
      },
    });

    const { createPrefetchedPage } = await import(
      "@/lib/rsc/create-prefetched-page"
    );

    const run = vi.fn().mockResolvedValue(undefined);
    const children = "HELLO" as unknown as React.ReactNode;
    const result = (await createPrefetchedPage({ children, run })) as
      | ReactElement<{ state: unknown; children: React.ReactNode }>
      | null;

    expect(run).toHaveBeenCalledTimes(1);
    const call = run.mock.calls[0][0];
    expect(call.accessToken).toBe("t1");
    expect(call.userId).toBe("u1");
    // queryClient must be a QueryClient instance exposing prefetchQuery
    expect(typeof call.queryClient.prefetchQuery).toBe("function");

    // Result is a HydrationBoundary element with dehydrated state + children.
    expect(result).not.toBeNull();
    expect(result?.props).toBeDefined();
    expect(result?.props.state).toBeDefined();
    expect(result?.props.children).toBe(children);
  });

  it("does NOT call run and returns an empty-dehydrate HydrationBoundary when session is null (T-38-03 auth gate)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { createPrefetchedPage } = await import(
      "@/lib/rsc/create-prefetched-page"
    );

    const run = vi.fn();
    const children = "UNAUTHED" as unknown as React.ReactNode;
    const result = (await createPrefetchedPage({ children, run })) as
      | ReactElement<{ state: unknown; children: React.ReactNode }>
      | null;

    expect(run).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.props.children).toBe(children);
    // Dehydrated empty state shape: { queries: [], mutations: [] } — or equivalent.
    // Just assert it exists and has no queries.
    const state = result?.props.state as { queries?: unknown[] } | undefined;
    expect(Array.isArray(state?.queries)).toBe(true);
    expect(state?.queries).toHaveLength(0);
  });

  it("isolates per-query rejection via QueryCache onError: captures to Sentry once with phase:38 + operation:rsc_prefetch tags, does NOT throw outward", async () => {
    // DEVIATION (Rule 1 bug fix): TanStack's queryClient.prefetchQuery()
    // ALWAYS resolves its returned promise — even on queryFn error — so the
    // pattern `.prefetchQuery(...).catch(wrapSentry(...))` NEVER fires. We
    // wire silent-degrade via QueryCache `onError` subscriber which fires
    // reliably for every failed prefetch. wrapSentry helper remains exported
    // for explicit fetchQuery call sites (which do reject on error).
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1" }, access_token: "t1" },
      },
    });

    const { createPrefetchedPage } = await import(
      "@/lib/rsc/create-prefetched-page"
    );

    let resolvedData: unknown;

    await expect(
      createPrefetchedPage({
        children: null,
        run: async ({ queryClient }) => {
          const good = queryClient.prefetchQuery({
            queryKey: ["good"],
            queryFn: async () => {
              resolvedData = { ok: true };
              return resolvedData;
            },
            retry: false,
          });
          const bad = queryClient.prefetchQuery({
            queryKey: ["bad"],
            queryFn: async () => {
              throw new Error("boom");
            },
            retry: false,
          });
          await Promise.allSettled([good, bad]);
        },
      }),
    ).resolves.not.toBeNull();

    expect(resolvedData).toEqual({ ok: true });

    // Sentry.captureException invoked exactly once — only for the failed query.
    // Phase 38 sentry tag convention:
    //   tags: { phase, operation, query }
    //   extra: { userId, queryKey }
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = mockCaptureException.mock.calls[0];
    expect((err as Error).message).toBe("boom");
    expect(ctx).toMatchObject({
      tags: { phase: "38", operation: "rsc_prefetch", query: "bad" },
    });
    const extra = (
      ctx as { extra: { userId: string; queryKey?: string } }
    ).extra;
    expect(extra.userId).toBe("u1");
    expect(typeof extra.queryKey).toBe("string");
    expect(JSON.parse(extra.queryKey ?? "null")).toEqual(["bad"]);
  });

  it("Sentry tag shape: tags include phase=38, operation=rsc_prefetch; extra includes userId", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1" }, access_token: "t1" },
      },
    });

    const { wrapSentry } = await import("@/lib/rsc/create-prefetched-page");
    const handler = wrapSentry("courses", "u1", { extraKey: "v" });
    handler(new Error("nope"));

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [, ctx] = mockCaptureException.mock.calls[0];
    expect(ctx).toMatchObject({
      tags: { phase: "38", operation: "rsc_prefetch", query: "courses" },
      extra: { userId: "u1", extraKey: "v" },
    });
  });

  it("outer error: if run throws synchronously, HOF captures to Sentry with operation=rsc_prefetch_outer and still renders HydrationBoundary", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: "u1" }, access_token: "t1" },
      },
    });

    const { createPrefetchedPage } = await import(
      "@/lib/rsc/create-prefetched-page"
    );

    const result = (await createPrefetchedPage({
      children: "CHILD" as unknown as React.ReactNode,
      run: async () => {
        throw new Error("outer");
      },
    })) as ReactElement<{ state: unknown; children: React.ReactNode }> | null;

    expect(result).not.toBeNull();
    expect(result?.props.children).toBe("CHILD");
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = mockCaptureException.mock.calls[0];
    expect((err as Error).message).toBe("outer");
    expect(ctx).toMatchObject({
      tags: { phase: "38", operation: "rsc_prefetch_outer" },
    });
    expect((ctx as { extra: { userId: string } }).extra.userId).toBe("u1");
  });
});
