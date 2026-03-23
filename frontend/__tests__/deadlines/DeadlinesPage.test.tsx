import { describe, it, expect, vi, beforeEach } from "vitest";
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
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      title: "Deadlines",
      semester: "2026 S1",
      filterBadge: `${params?.count ?? "0"} upcoming`,
      modeAll: "All",
      modeWeek: "This Week",
      viewTimeline: "Timeline",
      viewCalendar: "Calendar",
      filterCourse: "All Courses",
      expandHint: "Click to expand materials & AI chat",
      relatedMaterials: "Related Materials",
      askAbout: "Ask about this deadline",
      aiContextNote: "Materials auto-included in context",
      aiPlaceholder: "Ask about this deadline...",
      aiComingSoon: "Coming Soon",
      aiDisclaimer: "AI responses are for study reference only",
      daysRemaining: `${params?.count ?? "0"} days`,
      dayRemaining: "1 day",
      pastDue: "Past due",
      emptyTitle: "No Deadlines",
      emptyBody: "No upcoming deadlines found. Enjoy the break!",
      errorMessage:
        "Failed to load deadlines. Please try refreshing the page.",
    };
    return map[key] ?? key;
  },
}));

// Mock withClientOnly to passthrough
vi.mock("@/components/design-system/ClientOnly", () => ({
  withClientOnly: () => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="client-only-mock" {...props} />
    );
    MockComponent.displayName = "ClientOnlyMock";
    return MockComponent;
  },
}));

// Mock router
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock getCourseColor
vi.mock("@/lib/dashboard/course-colors", () => ({
  getCourseColor: (code: string) => {
    const colors: Record<string, { base: string; soft: string }> = {
      COMP2017: { base: "#d97757", soft: "rgba(217,119,87,.11)" },
      COMP3221: { base: "#6a9bcc", soft: "rgba(106,155,204,.11)" },
    };
    return colors[code] ?? { base: "#9b9b94", soft: "rgba(155,155,148,.11)" };
  },
}));

// Mock useDeadlines hook — controlled by mockDeadlinesReturn
let mockDeadlinesReturn: {
  data: { data: Array<Record<string, unknown>> } | undefined;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("@/hooks/use-deadlines", () => ({
  useDeadlines: () => mockDeadlinesReturn,
}));

import DeadlinesPage from "@/components/deadlines/DeadlinesPage";

const mockDeadlines = [
  {
    id: "ddl_1",
    title: "Assignment 2",
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    source: "canvas_assignment",
    weight: 0.1,
    status: "upcoming",
    days_remaining: 2,
    course_code: "COMP2017",
    course_name: "Systems Programming",
    is_confirmed: true,
  },
  {
    id: "ddl_2",
    title: "Project Milestone",
    due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    source: "canvas_assignment",
    weight: 0.25,
    status: "upcoming",
    days_remaining: 14,
    course_code: "COMP3221",
    course_name: "Distributed Systems",
    is_confirmed: true,
  },
];

describe("DeadlinesPage", () => {
  beforeEach(() => {
    mockDeadlinesReturn = {
      data: undefined,
      isLoading: false,
      isError: false,
    };
  });

  it("renders title and semester badge", () => {
    mockDeadlinesReturn = {
      data: { data: mockDeadlines },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);
    expect(screen.getByText("Deadlines")).toBeTruthy();
    expect(screen.getByText("2026 S1")).toBeTruthy();
  });

  it("shows skeleton cards during loading", () => {
    mockDeadlinesReturn = {
      data: undefined,
      isLoading: true,
      isError: false,
    };
    render(<DeadlinesPage />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons.length).toBe(3);
  });

  it("shows empty state when no deadlines", () => {
    mockDeadlinesReturn = {
      data: { data: [] },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);
    expect(screen.getByText("No Deadlines")).toBeTruthy();
    expect(
      screen.getByText("No upcoming deadlines found. Enjoy the break!")
    ).toBeTruthy();
  });

  it("shows error state on fetch failure", () => {
    mockDeadlinesReturn = {
      data: undefined,
      isLoading: false,
      isError: true,
    };
    render(<DeadlinesPage />);
    expect(
      screen.getByText(
        "Failed to load deadlines. Please try refreshing the page."
      )
    ).toBeTruthy();
  });

  it("renders deadline cards when data loads", () => {
    mockDeadlinesReturn = {
      data: { data: mockDeadlines },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    expect(screen.getByText("Project Milestone")).toBeTruthy();
  });

  it("filters by course when course dropdown changes", () => {
    mockDeadlinesReturn = {
      data: { data: mockDeadlines },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);
    // Both visible initially
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    expect(screen.getByText("Project Milestone")).toBeTruthy();

    // Select COMP2017 course
    const dropdown = screen.getByTestId("course-filter");
    fireEvent.change(dropdown, { target: { value: "COMP2017" } });

    // Only COMP2017 deadline visible
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    expect(screen.queryByText("Project Milestone")).toBeNull();
  });

  it("switches between All and This Week mode", () => {
    mockDeadlinesReturn = {
      data: { data: mockDeadlines },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);

    // Both visible in "All" mode
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    expect(screen.getByText("Project Milestone")).toBeTruthy();

    // Switch to "This Week"
    const weekBtn = screen.getByTestId("mode-week");
    fireEvent.click(weekBtn);

    // Only deadline within 7 days should be visible (2 days = Assignment 2)
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    // Project Milestone is 14 days out — should be filtered
    expect(screen.queryByText("Project Milestone")).toBeNull();
  });

  it("switches between timeline and calendar view", () => {
    mockDeadlinesReturn = {
      data: { data: mockDeadlines },
      isLoading: false,
      isError: false,
    };
    render(<DeadlinesPage />);

    // Default: timeline view shows cards
    expect(screen.getByText("Assignment 2")).toBeTruthy();

    // Switch to calendar view
    const calBtn = screen.getByTestId("view-calendar");
    fireEvent.click(calBtn);

    // Calendar placeholder shown
    expect(
      screen.getByText("Calendar view coming in Plan 03")
    ).toBeTruthy();
  });
});
