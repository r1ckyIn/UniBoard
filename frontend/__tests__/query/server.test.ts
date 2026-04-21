import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tests run in jsdom environment per vitest.config.ts, so `window` is defined and
// @tanstack/react-query's `isServer` export reports false. We mock `isServer` per
// test to simulate both server and client contexts.
//
// We use a top-level spy variable that individual tests flip between true/false.
// `vi.mock` is hoisted, so the factory closes over this variable lazily at import
// time — flipping it before `await import("@/lib/query/server")` takes effect.
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

describe("getServerQueryClient", () => {
  beforeEach(() => {
    vi.resetModules();
    isServerFlag.value = true;
  });

  afterEach(() => {
    isServerFlag.value = true;
  });

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
    isServerFlag.value = false;
    const { getServerQueryClient } = await import("@/lib/query/server");
    expect(() => getServerQueryClient()).toThrow(/Server Component/);
  });
});
