import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

  it("validates both tokens and calls onSuccess when both backend calls succeed", async () => {
    const user = userEvent.setup();

    // Backend returns success for both platforms
    mockConfigureTokenMutateAsync.mockResolvedValue({
      data: { status: "active", courses_found: 5 },
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for backend calls to complete and onSuccess to be called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    // Verify backend was called for both platforms
    expect(mockConfigureTokenMutateAsync).toHaveBeenCalledTimes(2);
    expect(mockConfigureTokenMutateAsync).toHaveBeenCalledWith({
      platform: "canvas",
      body: { token: VALID_CANVAS_TOKEN },
    });
    expect(mockConfigureTokenMutateAsync).toHaveBeenCalledWith({
      platform: "ed",
      body: { token: VALID_ED_TOKEN },
    });

    // Both should show valid status
    const canvasValid = document.querySelector('[data-testid="status-valid-canvas"]');
    const edValid = document.querySelector('[data-testid="status-valid-ed"]');
    expect(canvasValid).toBeInTheDocument();
    expect(edValid).toBeInTheDocument();
  });

  it("shows Canvas invalid error and stops when Canvas token fails regex", async () => {
    const user = userEvent.setup();

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

    // Backend should NOT be called (regex failed before backend call)
    expect(mockConfigureTokenMutateAsync).not.toHaveBeenCalled();

    // onSuccess should NOT be called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("shows backend error when canvas token is rejected by API", async () => {
    const user = userEvent.setup();

    // Backend rejects canvas token (simulate ky HTTPError with 401 status)
    const httpError = Object.assign(new Error("Invalid Canvas API token"), {
      response: { status: 401 },
    });
    mockConfigureTokenMutateAsync.mockRejectedValueOnce(httpError);

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for backend error to surface
    await waitFor(() => {
      const invalidIcon = document.querySelector('[data-testid="status-invalid-canvas"]');
      expect(invalidIcon).toBeInTheDocument();
    });

    // onSuccess should NOT be called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("shows ed error when canvas passes but ed rejected by API", async () => {
    const user = userEvent.setup();

    // Canvas succeeds, Ed fails (simulate ky HTTPError with 401 status)
    const httpError = Object.assign(new Error("Invalid Ed API token"), {
      response: { status: 401 },
    });
    mockConfigureTokenMutateAsync
      .mockResolvedValueOnce({ data: { status: "active", courses_found: 5 } })
      .mockRejectedValueOnce(httpError);

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for Ed error to surface
    await waitFor(() => {
      const edInvalid = document.querySelector('[data-testid="status-invalid-ed"]');
      expect(edInvalid).toBeInTheDocument();
    });

    // Canvas should show valid
    const canvasValid = document.querySelector('[data-testid="status-valid-canvas"]');
    expect(canvasValid).toBeInTheDocument();

    // onSuccess should NOT be called
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("shows Ed invalid error when Canvas valid but Ed fails regex", async () => {
    const user = userEvent.setup();

    // Canvas backend succeeds
    mockConfigureTokenMutateAsync.mockResolvedValueOnce({
      data: { status: "active", courses_found: 5 },
    });

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, INVALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Wait for canvas backend call to complete, then Ed regex fails
    await waitFor(() => {
      const edInvalid = document.querySelector('[data-testid="status-invalid-ed"]');
      expect(edInvalid).toBeInTheDocument();
    });

    // Canvas should show valid
    const canvasValid = document.querySelector('[data-testid="status-valid-canvas"]');
    expect(canvasValid).toBeInTheDocument();

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
    const user = userEvent.setup();

    // Backend call never resolves to keep validating state
    mockConfigureTokenMutateAsync.mockImplementation(
      () => new Promise(() => {})
    );

    render(<TokenStep onBack={mockOnBack} onSuccess={mockOnSuccess} />);

    const canvasInput = screen.getByPlaceholderText("canvas.placeholder");
    const edInput = screen.getByPlaceholderText("ed.placeholder");

    await user.type(canvasInput, VALID_CANVAS_TOKEN);
    await user.type(edInput, VALID_ED_TOKEN);

    const validateButton = screen.getByText("cta");
    await user.click(validateButton);

    // Button should show "Validating..." text
    expect(screen.getByText("validating")).toBeInTheDocument();
  });
});
