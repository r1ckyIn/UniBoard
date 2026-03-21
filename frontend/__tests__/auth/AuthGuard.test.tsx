import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthGuard } from "@/components/auth/AuthGuard";

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

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false, tokenConfigured: false };
    isHydrated = true;
  });

  it("renders children when isAuthenticated is false", () => {
    mockAuthState = { isAuthenticated: false, tokenConfigured: false };

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("redirects to /dashboard when isAuthenticated=true and tokenConfigured=true", () => {
    mockAuthState = { isAuthenticated: true, tokenConfigured: true };

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to /setup when isAuthenticated=true and tokenConfigured=false", () => {
    mockAuthState = { isAuthenticated: true, tokenConfigured: false };

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/setup");
  });

  it("does not render children when isAuthenticated is true", () => {
    mockAuthState = { isAuthenticated: true, tokenConfigured: true };

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });
});
