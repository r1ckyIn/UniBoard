import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock roughjs since jsdom can't render SVG paths
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      circle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      termPrefix: "Term:",
      gradeLabel: "Grade:",
      assessedSuffix: "assessed",
      bandHD: "HD 85+",
      bandD: "D 75+",
      bandCR: "CR 65+",
      bandP: "P 50+",
      bandF: "F",
    };
    return map[key] ?? key;
  },
}));

// Mock router
const mockPush = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock withClientOnly to passthrough the component
vi.mock("@/components/design-system/ClientOnly", () => ({
  withClientOnly: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    // Return a simple wrapper that renders children/placeholder
    const MockComponent = (props: Record<string, unknown>) => {
      return <div data-testid="client-only-mock" {...props} />;
    };
    MockComponent.displayName = "ClientOnlyMock";
    return MockComponent;
  },
}));

import CourseCard from "@/components/courses/CourseCard";

const defaultProps = {
  id: "c1",
  name: "Systems Programming",
  code: "COMP2017",
  semester: "2026-S1",
  currentMark: 82.5,
  completedWeight: 0.4,
  colorBase: "#d97757",
  colorSoft: "rgba(217,119,87,.11)",
  decoIndex: 0,
};

describe("CourseCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("displays course name, code, and semester", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByText("Systems Programming")).toBeTruthy();
    expect(screen.getByText("COMP2017")).toBeTruthy();
    expect(screen.getByText(/2026-S1/)).toBeTruthy();
  });

  it("displays grade percentage with course color", () => {
    render(<CourseCard {...defaultProps} />);
    const gradeValue = screen.getByText("82.5%");
    expect(gradeValue).toBeTruthy();
    // jsdom converts hex to rgb format
    expect(gradeValue.style.color).toBe("rgb(217, 119, 87)");
  });

  it("displays grade band badge (e.g. D 75+)", () => {
    render(<CourseCard {...defaultProps} />);
    // 82.5 is D band
    expect(screen.getByText("D 75+")).toBeTruthy();
  });

  it("shows em-dash for null grade and hides badge", () => {
    render(<CourseCard {...defaultProps} currentMark={null} />);
    expect(screen.getByText("\u2014")).toBeTruthy();
    // Badge should not be present
    expect(screen.queryByText("HD 85+")).toBeNull();
    expect(screen.queryByText("D 75+")).toBeNull();
    expect(screen.queryByText("CR 65+")).toBeNull();
    expect(screen.queryByText("P 50+")).toBeNull();
    expect(screen.queryByText("F")).toBeNull();
  });

  it("shows progress bar with assessed percentage", () => {
    render(<CourseCard {...defaultProps} />);
    expect(screen.getByText("40% assessed")).toBeTruthy();
  });

  it("navigates to /courses/{id} on click", () => {
    render(<CourseCard {...defaultProps} />);
    const card = screen.getByTestId("course-card");
    fireEvent.click(card);
    expect(mockPush).toHaveBeenCalledWith("/courses/c1");
  });
});
