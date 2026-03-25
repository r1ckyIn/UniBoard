import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import NotificationsSection from "@/components/settings/NotificationsSection";

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders 3 deadline reminder toggles (72h, 24h, 3h)", () => {
    render(<NotificationsSection />);
    expect(screen.getByTestId("toggle-reminder72h")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-reminder24h")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-reminder3h")).toBeInTheDocument();
  });

  it("renders GPA risk alert toggle", () => {
    render(<NotificationsSection />);
    expect(screen.getByTestId("toggle-gpaRiskAlert")).toBeInTheDocument();
  });

  it("renders digest frequency selector (daily/weekly)", () => {
    render(<NotificationsSection />);
    expect(screen.getByText("notifications.daily")).toBeInTheDocument();
    expect(screen.getByText("notifications.weekly")).toBeInTheDocument();
  });

  it("renders email notifications toggle", () => {
    render(<NotificationsSection />);
    expect(screen.getByTestId("toggle-emailNotifications")).toBeInTheDocument();
  });

  it("toggling a switch updates its visual state", () => {
    render(<NotificationsSection />);
    const toggle = screen.getByTestId("toggle-reminder3h");

    // Default is off (reminder3h: false)
    expect(toggle).not.toBeChecked();

    // Click to turn on
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
  });
});
