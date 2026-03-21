import { describe, it, expect, beforeEach, vi } from "vitest";

// Use vi.hoisted() to create variables that are available in mock factories
const { capturedConfig, mockInstance } = vi.hoisted(() => {
  const config: { value: Record<string, unknown> } = { value: {} };
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  };
  return { capturedConfig: config, mockInstance: instance };
});

vi.mock("ky", () => ({
  default: {
    create: (config: Record<string, unknown>) => {
      capturedConfig.value = config;
      return mockInstance;
    },
  },
}));

// Import after mock setup so ky.create() captures the config
import { useAuthStore } from "@/lib/auth/store";
import "@/lib/api/client";

describe("api client", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("has prefixUrl set to /api/v1", () => {
    expect(capturedConfig.value.prefixUrl).toBe("/api/v1");
  });

  it("has retry config for GET methods on transient errors", () => {
    const retry = capturedConfig.value.retry as {
      limit: number;
      statusCodes: number[];
      methods: string[];
    };
    expect(retry.limit).toBe(2);
    expect(retry.methods).toEqual(["get"]);
    expect(retry.statusCodes).toContain(500);
    expect(retry.statusCodes).toContain(502);
    expect(retry.statusCodes).toContain(503);
  });

  it("has timeout set to 15000ms", () => {
    expect(capturedConfig.value.timeout).toBe(15000);
  });

  it("beforeRequest hook adds Authorization header when accessToken exists", () => {
    useAuthStore
      .getState()
      .setAuth(
        { access: "test_token_abc", refresh: "refresh_123" },
        { id: "u1", email: "a@b.com", displayName: "A" },
      );

    const hooks = capturedConfig.value.hooks as {
      beforeRequest: Array<(req: Request) => void>;
    };
    const beforeRequest = hooks.beforeRequest[0];

    const mockRequest = new Request("http://localhost/api/v1/courses");
    beforeRequest(mockRequest);

    expect(mockRequest.headers.get("Authorization")).toBe(
      "Bearer test_token_abc",
    );
  });

  it("beforeRequest hook does NOT add Authorization header when accessToken is null", () => {
    const hooks = capturedConfig.value.hooks as {
      beforeRequest: Array<(req: Request) => void>;
    };
    const beforeRequest = hooks.beforeRequest[0];

    const mockRequest = new Request("http://localhost/api/v1/courses");
    beforeRequest(mockRequest);

    expect(mockRequest.headers.get("Authorization")).toBeNull();
  });

  it("afterResponse hook calls clearAuth on 401 response", async () => {
    useAuthStore
      .getState()
      .setAuth(
        { access: "token", refresh: "ref" },
        { id: "u1", email: "a@b.com", displayName: "A" },
      );

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    const hooks = capturedConfig.value.hooks as {
      afterResponse: Array<
        (
          req: Request,
          opts: Record<string, unknown>,
          res: Response,
        ) => Promise<void>
      >;
    };
    const afterResponse = hooks.afterResponse[0];

    const mockRequest = new Request("http://localhost/api/v1/courses");
    const mockResponse = new Response(null, { status: 401 });
    await afterResponse(mockRequest, {}, mockResponse);

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("afterResponse hook does NOT clear auth on non-401 response", async () => {
    useAuthStore
      .getState()
      .setAuth(
        { access: "token", refresh: "ref" },
        { id: "u1", email: "a@b.com", displayName: "A" },
      );

    const hooks = capturedConfig.value.hooks as {
      afterResponse: Array<
        (
          req: Request,
          opts: Record<string, unknown>,
          res: Response,
        ) => Promise<void>
      >;
    };
    const afterResponse = hooks.afterResponse[0];

    const mockRequest = new Request("http://localhost/api/v1/courses");
    const mockResponse = new Response(null, { status: 200 });
    await afterResponse(mockRequest, {}, mockResponse);

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
