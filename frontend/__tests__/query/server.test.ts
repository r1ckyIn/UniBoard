import { describe, it, expect, vi } from "vitest";

describe("getServerQueryClient", () => {
  it("returns a fresh QueryClient instance on every call (no cross-request sharing)", async () => {
    // T-38-01: information disclosure via shared cache. Must be fresh per call.
    const { getServerQueryClient } = await import("@/lib/query/server");
    const a = getServerQueryClient();
    const b = getServerQueryClient();
    expect(a).not.toBe(b);
  });

  it("mirrors client staleTime (5 * 60 * 1000 ms) byte-identical to frontend/lib/query/client.tsx", async () => {
    const { getServerQueryClient } = await import("@/lib/query/server");
    const client = getServerQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it("mirrors client queries retry === 1", async () => {
    const { getServerQueryClient } = await import("@/lib/query/server");
    const client = getServerQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
  });

  it("mirrors client refetchOnWindowFocus === false", async () => {
    const { getServerQueryClient } = await import("@/lib/query/server");
    const client = getServerQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false,
    );
  });

  it("mirrors client mutations retry === 0", async () => {
    const { getServerQueryClient } = await import("@/lib/query/server");
    const client = getServerQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(0);
  });

  it("throws a clear error when called from a client context (isServer === false)", async () => {
    // Mock @tanstack/react-query to report isServer as false. We simulate client
    // misuse and assert the factory refuses to run. This guards against accidental
    // client-side imports that would silently leak cache across users in dev.
    vi.resetModules();
    vi.doMock("@tanstack/react-query", async () => {
      const actual =
        await vi.importActual<typeof import("@tanstack/react-query")>(
          "@tanstack/react-query",
        );
      return { ...actual, isServer: false };
    });

    const { getServerQueryClient } = await import("@/lib/query/server");
    expect(() => getServerQueryClient()).toThrow(/Server Component/);

    vi.doUnmock("@tanstack/react-query");
    vi.resetModules();
  });
});
