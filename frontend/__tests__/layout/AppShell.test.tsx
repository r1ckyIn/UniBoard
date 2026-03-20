import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next-intl navigation
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock roughjs (not available in jsdom)
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

import AppShell from "@/components/layout/AppShell";

describe("AppShell", () => {
  it("renders children inside the layout", () => {
    render(
      <AppShell>
        <div data-testid="test-content">Test Content</div>
      </AppShell>
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders sidebar with navigation items", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Sidebar should contain nav items (translation keys since mocked)
    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(screen.getByText("timetable")).toBeInTheDocument();
    expect(screen.getByText("courses")).toBeInTheDocument();
    expect(screen.getByText("deadlines")).toBeInTheDocument();
    expect(screen.getByText("predict")).toBeInTheDocument();
    expect(screen.getByText("digest")).toBeInTheDocument();
    expect(screen.getByText("settings")).toBeInTheDocument();
  });

  it("renders header with brand text", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Header brand text (translation key since mocked)
    expect(screen.getByText("brand")).toBeInTheDocument();
  });

  it("renders header with search input", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    // Search input with placeholder
    const searchInput = screen.getByPlaceholderText("search");
    expect(searchInput).toBeInTheDocument();
  });
});
