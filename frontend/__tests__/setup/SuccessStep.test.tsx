import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  useLocale: () => "en",
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const mockSetTokenConfigured = vi.fn();
vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(() => ({}), {
    getState: () => ({ setTokenConfigured: mockSetTokenConfigured }),
  }),
}));

// useCourses returns 0 courses by default; tests can override via mockCoursesData
let mockCoursesData: { data: { code: string }[] } | undefined = { data: [] };
vi.mock("@/hooks/use-courses", () => ({
  useCourses: () => ({ data: mockCoursesData }),
}));

// useSyncTrigger captures the body passed to mutate / mutateAsync.
const mockSyncTriggerMutateAsync = vi.fn();
const mockSyncTriggerMutate = vi.fn();
vi.mock("@/hooks/use-sync", () => ({
  syncOptions: { status: () => ({ queryKey: ["sync", "status"], queryFn: vi.fn() }) },
  useSyncTrigger: () => ({
    mutateAsync: mockSyncTriggerMutateAsync,
    mutate: mockSyncTriggerMutate,
    isPending: false,
  }),
}));

// useQuery is the source of /sync/status data. Let each test set what it returns.
type MockSyncResp = {
  data?: {
    last_sync?: { status: string };
    per_platform_counts?: {
      canvas: { grades: number; deadlines: number; total: number };
      ed: { discussions: number; total: number };
    } | null;
    platforms?: {
      canvas: { status: string; last_success: string };
      ed: { status: string; last_success: string };
    };
  };
};

let mockSyncQueryData: MockSyncResp = {};
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockSyncQueryData }),
}));

// IMPORTANT: import after mocks
import SuccessStep from "@/components/setup/SuccessStep";

beforeEach(() => {
  vi.clearAllMocks();
  mockSyncTriggerMutateAsync.mockResolvedValue({ data: {} });
  mockCoursesData = { data: [] };
  mockSyncQueryData = {};
});

describe("SuccessStep platform rows", () => {
  it("renders two platform rows in pending state when sync has not started", async () => {
    // Sync status response with nothing populated (per_platform_counts null).
    mockSyncQueryData = {
      data: {
        last_sync: { status: "in_progress" },
        per_platform_counts: null,
        platforms: {
          canvas: { status: "healthy", last_success: "" },
          ed: { status: "healthy", last_success: "" },
        },
      },
    };

    render(<SuccessStep />);

    // Both rows render
    const canvasRow = await screen.findByTestId("platform-row-canvas");
    const edRow = await screen.findByTestId("platform-row-ed");
    expect(canvasRow).toBeInTheDocument();
    expect(edRow).toBeInTheDocument();
  });

  it("Canvas row shows checkmark + counts when canvas health is healthy and counts populated", async () => {
    mockCoursesData = { data: [{ code: "INFO1110" }, { code: "MATH1004" }] };
    mockSyncQueryData = {
      data: {
        last_sync: { status: "completed" },
        per_platform_counts: {
          canvas: { grades: 12, deadlines: 8, total: 20 },
          ed: { discussions: 5, total: 5 },
        },
        platforms: {
          canvas: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
          ed: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
        },
      },
    };

    render(<SuccessStep />);

    await waitFor(() => {
      const row = screen.getByTestId("platform-row-canvas");
      expect(row).toHaveAttribute("data-status", "success");
    });
    // Counts line includes canvasCounts key
    const canvasRow = screen.getByTestId("platform-row-canvas");
    expect(canvasRow.textContent).toContain("canvasCounts");
    expect(canvasRow.textContent).toContain("courses");
  });

  it("Ed row shows error icon and Retry failed only button when ed health is error", async () => {
    mockSyncQueryData = {
      data: {
        last_sync: { status: "completed" },
        per_platform_counts: {
          canvas: { grades: 1, deadlines: 1, total: 2 },
          ed: { discussions: 0, total: 0 },
        },
        platforms: {
          canvas: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
          ed: { status: "error", last_success: "2026-04-15T09:00:00Z" },
        },
      },
    };

    render(<SuccessStep />);

    await waitFor(() => {
      const row = screen.getByTestId("platform-row-ed");
      expect(row).toHaveAttribute("data-status", "failed");
    });
    expect(screen.getByTestId("retry-failed-button")).toBeInTheDocument();
  });

  it("clicking 'Retry failed only' triggers sync with only failed platforms", async () => {
    mockSyncQueryData = {
      data: {
        last_sync: { status: "completed" },
        per_platform_counts: {
          canvas: { grades: 0, deadlines: 0, total: 0 },
          ed: { discussions: 0, total: 0 },
        },
        platforms: {
          canvas: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
          ed: { status: "error", last_success: "2026-04-15T09:00:00Z" },
        },
      },
    };

    render(<SuccessStep />);

    const retryButton = await screen.findByTestId("retry-failed-button");
    fireEvent.click(retryButton);

    expect(mockSyncTriggerMutate).toHaveBeenCalledTimes(1);
    expect(mockSyncTriggerMutate).toHaveBeenCalledWith({
      scope: "all",
      platforms: ["ed"],
    });
  });

  it("does not render Retry button when both platforms are healthy", async () => {
    mockSyncQueryData = {
      data: {
        last_sync: { status: "completed" },
        per_platform_counts: {
          canvas: { grades: 1, deadlines: 1, total: 2 },
          ed: { discussions: 1, total: 1 },
        },
        platforms: {
          canvas: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
          ed: { status: "healthy", last_success: "2026-04-15T10:00:00Z" },
        },
      },
    };

    render(<SuccessStep />);

    // Wait for component to mount + use effect to fire
    await screen.findByTestId("platform-row-canvas");
    expect(screen.queryByTestId("retry-failed-button")).not.toBeInTheDocument();
  });
});
