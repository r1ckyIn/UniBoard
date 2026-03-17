import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock hooks and stores before importing component
vi.mock("@/lib/hooks/useNotifications", () => ({
  useUnreadCount: vi.fn(() => ({ data: { count: 0 }, isLoading: false })),
}));

vi.mock("@/lib/stores/notifications", () => ({
  useNotificationStore: vi.fn(() => ({
    unreadCount: 0,
    toggleDropdown: vi.fn(),
  })),
}));

import NotificationBell from "@/components/notifications/NotificationBell";
import { useNotificationStore } from "@/lib/stores/notifications";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Bell icon", () => {
    render(<NotificationBell />);
    const bell = screen.getByTestId("notification-bell");
    expect(bell).toBeInTheDocument();
  });

  it("shows badge when unreadCount > 0", () => {
    vi.mocked(useNotificationStore).mockReturnValue({
      unreadCount: 3,
      toggleDropdown: vi.fn(),
      isDropdownOpen: false,
      setUnreadCount: vi.fn(),
      decrementUnread: vi.fn(),
      closeDropdown: vi.fn(),
    });

    render(<NotificationBell />);
    const badge = screen.getByTestId("notification-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");
  });

  it("does not show badge when unreadCount is 0", () => {
    vi.mocked(useNotificationStore).mockReturnValue({
      unreadCount: 0,
      toggleDropdown: vi.fn(),
      isDropdownOpen: false,
      setUnreadCount: vi.fn(),
      decrementUnread: vi.fn(),
      closeDropdown: vi.fn(),
    });

    render(<NotificationBell />);
    const badge = screen.queryByTestId("notification-badge");
    expect(badge).not.toBeInTheDocument();
  });
});
