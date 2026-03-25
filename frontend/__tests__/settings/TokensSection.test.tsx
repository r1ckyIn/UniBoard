import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  useLocale: () => "en",
}));

// Mock use-user hooks
const mockConfigureTokenMutate = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useConfigureToken: () => ({
    mutate: mockConfigureTokenMutate,
    isPending: false,
  }),
}));

// Mock use-sync
const mockSyncTriggerMutate = vi.fn();
vi.mock("@/hooks/use-sync", () => ({
  useSyncTrigger: () => ({
    mutate: mockSyncTriggerMutate,
    isPending: false,
  }),
}));

// Mock date-fns to avoid flaky time-based tests
vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "12 minutes",
}));

import TokensSection from "@/components/settings/TokensSection";
import { mockUser } from "@/lib/fixtures/users";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

function renderTokensSection(userOverride?: Partial<User>) {
  const user = { ...mockUser, ...userOverride } as User;
  return render(<TokensSection user={user} />);
}

describe("TokensSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Canvas and Ed platform rows with correct names", () => {
    renderTokensSection();

    expect(screen.getByText("tokens.canvasName")).toBeInTheDocument();
    expect(screen.getByText("tokens.edName")).toBeInTheDocument();
  });

  it("shows Active badge when token status is active", () => {
    renderTokensSection({
      tokens: {
        canvas: { status: "active", last_verified_at: "2026-03-01T10:00:00Z" },
        ed: { status: "active", last_verified_at: "2026-03-01T10:00:00Z" },
      },
    });

    const activeBadges = screen.getAllByText("tokens.statusActive");
    expect(activeBadges).toHaveLength(2);
  });

  it("shows Invalid badge when token status is invalid", () => {
    renderTokensSection({
      tokens: {
        canvas: { status: "invalid", last_verified_at: "2026-03-01T10:00:00Z" },
        ed: { status: "active", last_verified_at: "2026-03-01T10:00:00Z" },
      },
    });

    expect(screen.getByText("tokens.statusInvalid")).toBeInTheDocument();
  });

  it("shows Not Configured badge when token status is not_configured", () => {
    renderTokensSection({
      tokens: {
        canvas: { status: "not_configured", last_verified_at: null },
        ed: { status: "active", last_verified_at: "2026-03-01T10:00:00Z" },
      },
    });

    expect(screen.getByText("tokens.statusNotConfigured")).toBeInTheDocument();
  });

  it("toggles token input between password and text type on eye icon click", () => {
    renderTokensSection();

    const toggleBtn = screen.getByTestId("token-toggle-canvas");
    const canvasInput = screen.getByPlaceholderText("tokens.canvasPlaceholder");

    // Initially password
    expect(canvasInput).toHaveAttribute("type", "password");

    // Click to reveal
    fireEvent.click(toggleBtn);
    expect(canvasInput).toHaveAttribute("type", "text");

    // Click to hide
    fireEvent.click(toggleBtn);
    expect(canvasInput).toHaveAttribute("type", "password");
  });

  it("disables Update button when token input is empty", () => {
    renderTokensSection();

    const updateButtons = screen.getAllByText("tokens.update");
    // Both Update buttons should be disabled when inputs are empty
    updateButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("renders Sync Now button", () => {
    renderTokensSection();

    expect(screen.getByText("tokens.syncNow")).toBeInTheDocument();
  });
});
