import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import HeroSection from "@/components/dashboard/HeroSection";

// Mock next-intl (not directly used by HeroSection, but may be imported transitively)
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock RoughNotationWrapper (react-rough-notation animation not testable in jsdom)
vi.mock("@/components/design-system/RoughNotationWrapper", () => ({
  RoughNotationItem: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <span>{children}</span>,
  RoughNotationSequence: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div>{children}</div>,
}));

// Mock HeroDoodles (Rough.js canvas-based, not testable in jsdom)
vi.mock("@/components/design-system/HeroDoodles", () => ({
  default: () => <div data-testid="hero-doodles" />,
}));

// Mock date-fns format to get deterministic output
vi.mock("date-fns", () => ({
  format: () => "March 17, 2026",
}));

// Mock date utils for deterministic output
vi.mock("@/lib/utils/dates", () => ({
  formatGreeting: () => "Good morning",
  formatWeekday: () => "Monday",
  formatDeadline: (iso: string) => iso,
  formatRelative: (iso: string) => iso,
}));

describe("HeroSection", () => {
  it("renders greeting with display name", () => {
    render(<HeroSection displayName="Emily" />);
    expect(screen.getByText(/Good morning/)).toBeInTheDocument();
    expect(screen.getByText(/Emily/)).toBeInTheDocument();
  });

  it("renders scroll prompt", () => {
    render(<HeroSection displayName="Student" />);
    expect(screen.getByText(/your dashboard/i)).toBeInTheDocument();
  });

  it("displays WAM when provided", () => {
    render(<HeroSection displayName="Emily" wam={82.5} />);
    expect(screen.getByText(/82\.5/)).toBeInTheDocument();
  });

  it("does not display WAM section when not provided", () => {
    const { container } = render(<HeroSection displayName="Emily" />);
    expect(container.textContent).not.toContain("Current WAM:");
  });

  it("occupies full viewport height", () => {
    const { container } = render(<HeroSection displayName="Emily" />);
    const heroEl = container.firstChild as HTMLElement;
    expect(
      heroEl.style.minHeight === "100vh" ||
        heroEl.className.includes("min-h-screen")
    ).toBe(true);
  });

  it("renders hero doodles background", () => {
    render(<HeroSection displayName="Emily" />);
    expect(screen.getByTestId("hero-doodles")).toBeInTheDocument();
  });
});
