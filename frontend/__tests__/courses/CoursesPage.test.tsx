import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      title: "My Courses",
      filterBadge: `${params?.count ?? "0"} Published`,
      termPrefix: "Term:",
      gradeLabel: "Grade:",
      assessedSuffix: "assessed",
      bandHD: "HD 85+",
      bandD: "D 75+",
      bandCR: "CR 65+",
      bandP: "P 50+",
      bandF: "F",
      emptyTitle: "No Courses Yet",
      emptyBody:
        "Your enrolled courses will appear here after syncing with Canvas.",
      errorMessage:
        "Failed to load courses. Please try refreshing the page.",
    };
    return map[key] ?? key;
  },
}));

// Mock router
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock withClientOnly to passthrough as a simple div
vi.mock("@/components/design-system/ClientOnly", () => ({
  withClientOnly: () => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="client-only-mock" {...props} />
    );
    MockComponent.displayName = "ClientOnlyMock";
    return MockComponent;
  },
}));

// Mock useCourses hook — controlled by mockCoursesReturn
let mockCoursesReturn: {
  data: { data: Array<Record<string, unknown>> } | undefined;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/hooks/use-courses", () => ({
  useCourses: () => mockCoursesReturn,
}));

import CoursesPage from "@/components/courses/CoursesPage";

const mockCourses = [
  {
    id: "c1",
    name: "Systems Programming",
    code: "COMP2017",
    semester: "2026-S1",
    credit_points: 6,
    current_mark: 82.5,
    completed_weight: 0.4,
  },
  {
    id: "c2",
    name: "Distributed Systems",
    code: "COMP3221",
    semester: "2026-S1",
    credit_points: 6,
    current_mark: 71.0,
    completed_weight: 0.25,
  },
];

describe("CoursesPage", () => {
  it("renders course cards when data loads", () => {
    mockCoursesReturn = {
      data: { data: mockCourses },
      isLoading: false,
      isError: false,
    };
    render(<CoursesPage />);
    expect(screen.getByText("My Courses")).toBeTruthy();
    expect(screen.getByText("Systems Programming")).toBeTruthy();
    expect(screen.getByText("Distributed Systems")).toBeTruthy();
    expect(screen.getByText("2 Published")).toBeTruthy();
  });

  it("shows skeleton cards during loading", () => {
    mockCoursesReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
    };
    const { container } = render(<CoursesPage />);
    // Skeleton cards have h-[120px] banner shimmer
    const shimmerBanners = container.querySelectorAll(".h-\\[120px\\]");
    expect(shimmerBanners.length).toBe(3);
  });

  it("shows empty state when no courses", () => {
    mockCoursesReturn = {
      data: { data: [] },
      isLoading: false,
      isError: false,
    };
    render(<CoursesPage />);
    expect(screen.getByText("No Courses Yet")).toBeTruthy();
    expect(
      screen.getByText(
        "Your enrolled courses will appear here after syncing with Canvas."
      )
    ).toBeTruthy();
  });

  it("shows error state on fetch failure", () => {
    mockCoursesReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
    };
    render(<CoursesPage />);
    expect(
      screen.getByText(
        "Failed to load courses. Please try refreshing the page."
      )
    ).toBeTruthy();
  });
});
