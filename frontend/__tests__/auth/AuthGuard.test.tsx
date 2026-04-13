import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

// Mock Supabase client — default: no session
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: null },
});
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: () => mockGetSession(),
    },
  }),
}));

// Mock restoreTokenConfiguredIfNeeded
const mockRestore = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/auth/restore-token-status", () => ({
  restoreTokenConfiguredIfNeeded: () => mockRestore(),
}));

// Track the zustand store state
let mockAuthState = {
  isAuthenticated: false,
  tokenConfigured: false,
};

const mockSetAuth = vi.fn();
let isHydrated = true;

vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(
    () => mockAuthState,
    {
      getState: () => ({
        ...mockAuthState,
        setAuth: mockSetAuth,
        tokenConfigured: mockAuthState.tokenConfigured,
      }),
      persist: {
        onFinishHydration: () => () => {},
        hasHydrated: () => isHydrated,
      },
    },
  ),
}));

const MOCK_SESSION = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  user: {
    id: "user-123",
    email: "test@example.com",
    user_metadata: { display_name: "Test User" },
  },
};

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { isAuthenticated: false, tokenConfigured: false };
    isHydrated = true;
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockRestore.mockResolvedValue(false);
  });

  it("renders children when no session exists", async () => {
    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to dashboard when session exists with configured tokens", async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    mockRestore.mockImplementation(() => {
      mockAuthState = { ...mockAuthState, tokenConfigured: true };
      return Promise.resolve(true);
    });

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/en");
    });
  });

  it("redirects to setup when session exists without configured tokens", async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });
    mockRestore.mockResolvedValue(false);

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/en/setup");
    });
  });

  it("does not redirect reactively when isAuthenticated changes (race condition guard)", async () => {
    // Start with no session — AuthGuard shows children
    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected")).toBeInTheDocument();
    });

    // Simulate onAuthStateChange setting isAuthenticated (as happens during login)
    // AuthGuard should NOT redirect — LoginForm handles its own navigation
    mockAuthState = { isAuthenticated: true, tokenConfigured: false };

    // Give React a tick to process any reactive effects
    await new Promise((r) => setTimeout(r, 50));

    // Should NOT have redirected to /setup — that was the old race condition
    expect(mockReplace).not.toHaveBeenCalled();
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

  it("calls setAuth with session data when session exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });

    render(
      <AuthGuard>
        <div data-testid="protected">Protected Content</div>
      </AuthGuard>,
    );

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        { access: "test-access-token", refresh: "test-refresh-token" },
        { id: "user-123", email: "test@example.com", displayName: "Test User" },
      );
    });
  });
});
