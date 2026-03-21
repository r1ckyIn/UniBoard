import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

import { courseKeys, useCourses, useCourseDetail } from "@/hooks/use-courses";

// ── Mock ky client ──────────────────────────────────────────────────────────
const { mockApi } = vi.hoisted(() => {
  const jsonFn = vi.fn();
  const instance = {
    get: vi.fn(() => ({ json: jsonFn })),
    post: vi.fn(() => ({ json: jsonFn })),
    put: vi.fn(() => ({ json: jsonFn })),
    delete: vi.fn(() => ({ json: jsonFn })),
    patch: vi.fn(() => ({ json: jsonFn })),
  };
  return { mockApi: { ...instance, _json: jsonFn } };
});

vi.mock("@/lib/api/client", () => ({
  api: mockApi,
}));

// ── Test helper ─────────────────────────────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// ── Fixtures ────────────────────────────────────────────────────────────────
const coursesFixture = {
  data: [
    {
      id: "crs_001",
      name: "Systems Programming",
      code: "COMP2017",
      semester: "2026-S1",
      credit_points: 6,
      current_mark: 82.5,
      grade_letter: "D",
      completed_weight: 0.4,
    },
    {
      id: "crs_002",
      name: "Data Structures",
      code: "COMP2123",
      semester: "2026-S1",
      credit_points: 6,
      current_mark: 75.0,
      grade_letter: "D",
      completed_weight: 0.3,
    },
  ],
  meta: {
    request_id: "req_test_001",
    timestamp: "2026-03-20T12:00:00Z",
  },
};

const courseDetailFixture = {
  data: {
    id: "crs_001",
    name: "Systems Programming",
    code: "COMP2017",
    semester: "2026-S1",
    credit_points: 6,
    current_mark: 82.5,
    grade_letter: "D",
    completed_weight: 0.4,
    assessment_weights: [
      {
        name: "Assignment 1",
        weight: 0.15,
        score: 85,
        max_score: 100,
        status: "graded" as const,
      },
      {
        name: "Final Exam",
        weight: 0.5,
        score: null,
        max_score: 100,
        status: "upcoming" as const,
      },
    ],
    weight_source: "unit_outline" as const,
  },
  meta: {
    request_id: "req_test_002",
    timestamp: "2026-03-20T12:00:00Z",
  },
};

// ── Tests ───────────────────────────────────────────────────────────────────
describe("courseKeys factory", () => {
  it("courseKeys.all returns ['courses']", () => {
    expect(courseKeys.all).toEqual(["courses"]);
  });

  it("courseKeys.list with semester returns correct key", () => {
    expect(courseKeys.list("2026-S1")).toEqual([
      "courses",
      "list",
      "2026-S1",
    ]);
  });

  it("courseKeys.list without semester returns key with undefined", () => {
    expect(courseKeys.list()).toEqual(["courses", "list", undefined]);
  });

  it("courseKeys.detail returns correct key with id", () => {
    expect(courseKeys.detail("crs_001")).toEqual([
      "courses",
      "detail",
      "crs_001",
    ]);
  });
});

describe("useCourses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns course data on successful API call", async () => {
    mockApi._json.mockResolvedValueOnce(coursesFixture);

    const { result } = renderHook(() => useCourses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(coursesFixture);
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].code).toBe("COMP2017");
    expect(mockApi.get).toHaveBeenCalledWith("courses");
  });

  it("returns error state when API call fails", async () => {
    mockApi._json.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCourses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });
});

describe("useCourseDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns course detail with assessment_weights for valid ID", async () => {
    mockApi._json.mockResolvedValueOnce(courseDetailFixture);

    const { result } = renderHook(() => useCourseDetail("crs_001"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.assessment_weights).toHaveLength(2);
    expect(result.current.data?.data.weight_source).toBe("unit_outline");
    expect(mockApi.get).toHaveBeenCalledWith("courses/crs_001");
  });
});
