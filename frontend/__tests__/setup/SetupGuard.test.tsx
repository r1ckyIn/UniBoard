import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SetupGuard } from "@/components/setup/SetupGuard";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Track the zustand store state we want to simulate
let mockAuthState = {
  isAuthenticated: false,
  tokenConfigured: false,
};

// Hydration control
let isHydrated = true;

vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(
    // The hook itself returns state
    () => mockAuthState,
    {
      persist: {
        onFinishHydration: () => {
          // Return unsubscribe function (noop for tests)
          return () => {};
        },
        hasHydrated: () => isHydrated,
      },
    },
  ),
}));

describe("SetupGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false, tokenConfigured: false };
    isHydrated = true;
  });

  it("redirects to /auth when not authenticated", () => {
    mockAuthState = { isAuthenticated: false, tokenConfigured: false };

    render(
      <SetupGuard>
        <div data-testid="setup-content">Setup Content</div>
      </SetupGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/auth");
    expect(screen.queryByTestId("setup-content")).not.toBeInTheDocument();
  });

  it("redirects to /dashboard when authenticated and tokenConfigured=true", () => {
    mockAuthState = { isAuthenticated: true, tokenConfigured: true };

    render(
      <SetupGuard>
        <div data-testid="setup-content">Setup Content</div>
      </SetupGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByTestId("setup-content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated and tokenConfigured=false", () => {
    mockAuthState = { isAuthenticated: true, tokenConfigured: false };

    render(
      <SetupGuard>
        <div data-testid="setup-content">Setup Content</div>
      </SetupGuard>,
    );

    expect(screen.getByTestId("setup-content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders nothing when not yet hydrated", () => {
    isHydrated = false;
    mockAuthState = { isAuthenticated: true, tokenConfigured: false };

    const { container } = render(
      <SetupGuard>
        <div data-testid="setup-content">Setup Content</div>
      </SetupGuard>,
    );

    expect(container.innerHTML).toBe("");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
