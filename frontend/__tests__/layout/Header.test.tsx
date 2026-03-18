import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock notification hooks and stores
vi.mock("@/lib/hooks/useNotifications", () => ({
  useUnreadCount: vi.fn(() => ({ data: { count: 0 }, isLoading: false })),
}));

vi.mock("@/lib/stores/notifications", () => ({
  useNotificationStore: vi.fn(() => ({
    unreadCount: 0,
    isDropdownOpen: false,
    toggleDropdown: vi.fn(),
    closeDropdown: vi.fn(),
    setUnreadCount: vi.fn(),
    decrementUnread: vi.fn(),
  })),
}));

// Mock notification hooks for dropdown
vi.mock("@/lib/hooks/useNotifications", () => ({
  useUnreadCount: vi.fn(() => ({ data: { count: 0 }, isLoading: false })),
  useNotifications: vi.fn(() => ({ data: [], isLoading: false })),
  useMarkRead: vi.fn(() => ({ mutate: vi.fn() })),
}));

// Mock date utils
vi.mock("@/lib/utils/dates", () => ({
  formatRelative: (iso: string) => iso,
}));

import Header from "@/components/layout/Header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the notification bell", () => {
    render(<Header />);
    const bell = screen.getByTestId("notification-bell");
    expect(bell).toBeInTheDocument();
  });

  it("renders the search placeholder input", () => {
    render(<Header />);
    const input = screen.getByPlaceholderText("Search courses, deadlines...");
    expect(input).toBeInTheDocument();
  });

  it("renders the user avatar", () => {
    render(<Header />);
    const avatar = screen.getByTestId("header-avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveTextContent("U");
  });

  it("search input is read-only", () => {
    render(<Header />);
    const input = screen.getByPlaceholderText("Search courses, deadlines...");
    expect(input).toHaveAttribute("readonly");
  });
});
