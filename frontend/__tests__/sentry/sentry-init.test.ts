import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @sentry/nextjs before any imports
const mockInit = vi.fn();
const mockReplayIntegration = vi.fn().mockReturnValue({ name: "Replay" });
const mockCaptureRouterTransitionStart = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: mockInit,
  replayIntegration: mockReplayIntegration,
  captureRouterTransitionStart: mockCaptureRouterTransitionStart,
}));

describe("instrumentation-client.ts", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("calls Sentry.init with correct DSN when NEXT_PUBLIC_SENTRY_DSN is set", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";
    process.env.NODE_ENV = "production";

    await import("@/instrumentation-client");

    expect(mockInit).toHaveBeenCalledTimes(1);
    const config = mockInit.mock.calls[0][0];
    expect(config.dsn).toBe("https://test@sentry.io/1");
  });

  it("does NOT call Sentry.init when NEXT_PUBLIC_SENTRY_DSN is empty", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "";

    await import("@/instrumentation-client");

    expect(mockInit).not.toHaveBeenCalled();
  });

  it("does NOT call Sentry.init when NEXT_PUBLIC_SENTRY_DSN is undefined", async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    await import("@/instrumentation-client");

    expect(mockInit).not.toHaveBeenCalled();
  });

  it("sets tracesSampleRate to 0.1", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.tracesSampleRate).toBe(0.1);
  });

  it("sets replaysSessionSampleRate to 0", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.replaysSessionSampleRate).toBe(0);
  });

  it("sets replaysOnErrorSampleRate to 1.0", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.replaysOnErrorSampleRate).toBe(1.0);
  });

  it("sets sendDefaultPii to false", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.sendDefaultPii).toBe(false);
  });

  it("sets environment to process.env.NODE_ENV", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";
    process.env.NODE_ENV = "production";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.environment).toBe("production");
  });

  describe("beforeSend noise filtering", () => {
    let beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;

    beforeEach(async () => {
      process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

      await import("@/instrumentation-client");

      const config = mockInit.mock.calls[0][0];
      beforeSend = config.beforeSend;
    });

    it("filters ChunkLoadError events", () => {
      const event = {
        exception: {
          values: [{ value: "ChunkLoadError: Loading chunk abc failed" }],
        },
      };
      expect(beforeSend(event)).toBeNull();
    });

    it("filters network error events (Failed to fetch)", () => {
      const event = {
        exception: {
          values: [{ value: "Failed to fetch" }],
        },
      };
      expect(beforeSend(event)).toBeNull();
    });

    it("filters NetworkError events", () => {
      const event = {
        exception: {
          values: [{ value: "NetworkError when attempting to fetch resource" }],
        },
      };
      expect(beforeSend(event)).toBeNull();
    });

    it("filters Load failed events", () => {
      const event = {
        exception: {
          values: [{ value: "Load failed" }],
        },
      };
      expect(beforeSend(event)).toBeNull();
    });

    it("passes through normal errors unchanged", () => {
      const event = {
        exception: {
          values: [{ value: "TypeError: x is not a function" }],
        },
      };
      expect(beforeSend(event)).toBe(event);
    });
  });

  it("includes ResizeObserver patterns in ignoreErrors", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/1";

    await import("@/instrumentation-client");

    const config = mockInit.mock.calls[0][0];
    expect(config.ignoreErrors).toContain(
      "ResizeObserver loop limit exceeded"
    );
    expect(config.ignoreErrors).toContain(
      "ResizeObserver loop completed with undelivered notifications"
    );
  });
});
