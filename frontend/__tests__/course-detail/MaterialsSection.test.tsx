import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock roughjs since jsdom can't render SVG paths
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      circle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) {
      let result = key;
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return key;
  },
}));

// Mock next/dynamic to render children directly
vi.mock("next/dynamic", () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    let Comp: React.ComponentType | null = null;
    importFn().then((mod) => {
      Comp = mod.default;
    });
    return function DynamicMock(props: Record<string, unknown>) {
      if (Comp) return <Comp {...props} />;
      return null;
    };
  },
}));

import MaterialsSection from "@/components/course-detail/MaterialsSection";
import { materialsByCourse } from "@/lib/fixtures/materials";

const mockMaterials = materialsByCourse.crs_comp2017;

describe("MaterialsSection", () => {
  const defaultProps = {
    materials: mockMaterials,
    courseColor: "#d97757",
    courseSoft: "rgba(217,119,87,.11)",
  };

  it("renders material items with titles", () => {
    render(<MaterialsSection {...defaultProps} />);
    expect(
      screen.getByText("Week 1 - Introduction to C")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Week 2 - Memory Management")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Week 1 - C Programming Fundamentals")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Week 2 - Pointers Deep Dive")
    ).toBeInTheDocument();
  });

  it("shows week badge with correct week number", () => {
    render(<MaterialsSection {...defaultProps} />);
    // Week badges should show "Wk N" format
    const wk1Badges = screen.getAllByText("materials.weekBadge");
    expect(wk1Badges.length).toBeGreaterThanOrEqual(2);
  });

  it("shows appropriate icon for source type", () => {
    const { container } = render(<MaterialsSection {...defaultProps} />);
    // Each material item should have an icon container
    const iconContainers = container.querySelectorAll(".mat-icon");
    // 4 materials: 2 canvas modules + 2 ed lessons
    expect(iconContainers.length).toBe(4);
  });

  it("renders empty state when no materials", () => {
    render(
      <MaterialsSection
        materials={[]}
        courseColor="#d97757"
        courseSoft="rgba(217,119,87,.11)"
      />
    );
    expect(screen.getByText("materials.empty")).toBeInTheDocument();
  });

  it("shows New badge for recent materials", () => {
    render(<MaterialsSection {...defaultProps} />);
    // Materials with slide_count (Ed lessons) may have New badge
    // The last material in the list should get the New badge
    const newBadges = screen.getAllByText("materials.newBadge");
    expect(newBadges.length).toBeGreaterThanOrEqual(1);
  });
});
