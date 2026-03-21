import { describe, it, expect } from "vitest";
import {
  mockResponse,
  mockError,
  requireAuth,
  mockPaginatedResponse,
} from "@/lib/fixtures/helpers";
import { GET as healthGET } from "@/app/api/v1/health/route";

describe("mock-routes envelope format", () => {
  describe("mockResponse", () => {
    it("wraps data in { data, meta: { request_id, timestamp } } envelope", async () => {
      const response = mockResponse({ foo: "bar" });
      const json = await response.json();

      expect(json).toEqual({
        data: { foo: "bar" },
        meta: {
          request_id: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it("generates a valid UUID for request_id", async () => {
      const response = mockResponse({ test: true });
      const json = await response.json();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(json.meta.request_id).toMatch(uuidRegex);
    });

    it("returns status 200 by default", () => {
      const response = mockResponse({ test: true });
      expect(response.status).toBe(200);
    });

    it("accepts custom status code", () => {
      const response = mockResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe("mockError", () => {
    it("wraps error in { error: { code, message } } format", async () => {
      const response = mockError(
        "AUTH_REQUIRED",
        "Authentication required",
        401,
      );
      const json = await response.json();

      expect(json).toEqual({
        error: {
          code: "AUTH_REQUIRED",
          message: "Authentication required",
        },
      });
    });

    it("sets the correct HTTP status code", () => {
      const response = mockError("NOT_FOUND", "Resource not found", 404);
      expect(response.status).toBe(404);
    });
  });

  describe("requireAuth", () => {
    it("returns null when Authorization Bearer header is present", () => {
      const request = new Request("http://localhost/api/v1/courses", {
        headers: { Authorization: "Bearer test-token" },
      });
      const result = requireAuth(request);
      expect(result).toBeNull();
    });

    it("returns 401 error when Authorization header is missing", async () => {
      const request = new Request("http://localhost/api/v1/courses");
      const result = requireAuth(request);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);

      const json = await result!.json();
      expect(json.error.code).toBe("AUTH_REQUIRED");
    });

    it("returns 401 error when Authorization header lacks Bearer prefix", async () => {
      const request = new Request("http://localhost/api/v1/courses", {
        headers: { Authorization: "Basic abc123" },
      });
      const result = requireAuth(request);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });
  });

  describe("mockPaginatedResponse", () => {
    const items = [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Charlie" },
      { id: "d", name: "Delta" },
      { id: "e", name: "Echo" },
    ];

    it("returns first N items with has_more true when data exceeds limit", async () => {
      const response = mockPaginatedResponse(items, null, 2);
      const json = await response.json();

      expect(json.data).toHaveLength(2);
      expect(json.data[0].name).toBe("Alpha");
      expect(json.data[1].name).toBe("Beta");
      expect(json.pagination.has_more).toBe(true);
      expect(json.pagination.next_cursor).not.toBeNull();
    });

    it("returns all items with has_more false when data fits within limit", async () => {
      const response = mockPaginatedResponse(items, null, 10);
      const json = await response.json();

      expect(json.data).toHaveLength(5);
      expect(json.pagination.has_more).toBe(false);
      expect(json.pagination.next_cursor).toBeNull();
    });

    it("includes meta with request_id and timestamp", async () => {
      const response = mockPaginatedResponse(items, null, 2);
      const json = await response.json();

      expect(json.meta).toEqual({
        request_id: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it("uses cursor to resume from correct position", async () => {
      // First page
      const page1 = mockPaginatedResponse(items, null, 2);
      const page1Json = await page1.json();
      const cursor = page1Json.pagination.next_cursor;

      // Second page using cursor
      const page2 = mockPaginatedResponse(items, cursor, 2);
      const page2Json = await page2.json();

      expect(page2Json.data).toHaveLength(2);
      expect(page2Json.data[0].name).toBe("Charlie");
      expect(page2Json.data[1].name).toBe("Delta");
      expect(page2Json.pagination.has_more).toBe(true);
    });
  });

  describe("health endpoint integration", () => {
    it("returns healthy status with checks without auth", async () => {
      const response = await healthGET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.status).toBe("healthy");
      expect(json.data.checks).toEqual({
        database: "ok",
        canvas_api: "ok",
        ed_api: "ok",
        cognito: "ok",
      });
      expect(json.data.version).toBe("1.0.0");
      expect(json.data.timestamp).toBeDefined();
      expect(json.meta.request_id).toBeDefined();
    });
  });
});
