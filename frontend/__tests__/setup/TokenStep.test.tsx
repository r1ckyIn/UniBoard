import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TokenStep from "@/components/setup/TokenStep";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? JSON.stringify(params) + key : key,
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth store
const mockSetTokenConfigured = vi.fn();
vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(() => ({}), {
    getState: () => ({
      setTokenConfigured: mockSetTokenConfigured,
    }),
  }),
}));

// Mock use-user (useConfigureToken)
const mockConfigureTokenMutateAsync = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useConfigureToken: () => ({
    mutateAsync: mockConfigureTokenMutateAsync,
    isPending: false,
  }),
}));

// Mock use-sync (useSyncTrigger)
const mockSyncTriggerMutateAsync = vi.fn();
vi.mock("@/hooks/use-sync", () => ({
  useSyncTrigger: () => ({
    mutateAsync: mockSyncTriggerMutateAsync,
    isPending: false,
  }),
}));

// Valid tokens for tests (Canvas: {id}~{secret}, Ed: alphanumeric 10-50 chars)
const VALID_CANVAS_TOKEN = "3156~PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde";
const VALID_ED_TOKEN = "abcdef1234567890"; // 16 chars
const INVALID_CANVAS_TOKEN = "abc123";
const INVALID_ED_TOKEN = "ab"; // too short

describe("TokenStep", () => {
  const mockOnBack = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("renders Canvas and Ed token input fields with correct labels", () => {
    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    expect(screen.getByPlaceholderText("canvas.placeholder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ed.placeholder")).toBeInTheDocument();
    expect(screen.getByText("canvas.label")).toBeInTheDocument();
    expect(screen.getByText("ed.label")).toBeInTheDocument();
  });

  it("shows 'Validate & Connect' button that is present", () => {
    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    expect(screen.getByText("cta")).toBeInTheDocument();
  });

  it("validates both tokens and calls onSuccess when both are valid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for 0.8s delay between canvas and ed validation
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Wait for 0.5s delay after both pass
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Both should show valid status (check-circle icons present)
    const canvasValid = document.querySelector('[data-testid="status-valid-canvas"]');
    const edValid = document.querySelector('[data-testid="status-valid-ed"]');
    expect(canvasValid).toBeInTheDocument();
    expect(edValid).toBeInTheDocument();

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows Canvas invalid error and stops when Canvas token is invalid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, INVALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Canvas should show invalid status
    const invalidIcon = document.querySelector('[data-testid="status-invalid-canvas"]');
    expect(invalidIcon).toBeInTheDocument();

    // Error message should contain the error text
    expect(screen.getByText("errors.canvas")).toBeInTheDocument();

    // Ed token should NOT be validated (no status icon)
    const edValid = document.querySelector('[data-testid="status-valid-ed"]');
    const edInvalid = document.querySelector('[data-testid="status-invalid-ed"]');
    expect(edValid).not.toBeInTheDocument();
    expect(edInvalid).not.toBeInTheDocument();

    // onSuccess should NOT be called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("shows Ed invalid error when Canvas valid but Ed invalid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, INVALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for 0.8s delay
    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    // Canvas should show valid
    const canvasValid = document.querySelector('[data-testid="status-valid-canvas"]');
    expect(canvasValid).toBeInTheDocument();

    // Ed should show invalid
    const edInvalid = document.querySelector('[data-testid="status-invalid-ed"]');
    expect(edInvalid).toBeInTheDocument();

    // Ed error message should appear
    expect(screen.getByText("errors.ed")).toBeInTheDocument();

    // onSuccess should NOT be called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("calls onBack when Back button is clicked", async () => {
    const user = userEvent.setup();

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const backButton = screen.getByText("back");
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("shows 'Validating...' text during validation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime,
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Button should show "Validating..." text
    expect(screen.getByText("validating")).toBeInTheDocument();

    // Clean up timers
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
  });
});
