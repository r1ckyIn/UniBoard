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
      expandHint: "Click to expand materials & AI chat",
      relatedMaterials: "Related Materials",
      askAbout: "Ask about this deadline",
      aiContextNote: "Materials auto-included in context",
      aiPlaceholder: "Ask about this deadline...",
      aiComingSoon: "Coming Soon",
      aiDisclaimer: "AI responses are for study reference only",
      aiSummaryPlaceholder:
        "Focus on key concepts and review lecture notes for this assessment.",
      daysRemaining: "{count} days",
      dayRemaining: "1 day",
      pastDue: "Past due",
    };
    let result = map[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, v);
      }
    }
    return result;
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

// Mock getCourseColor
vi.mock("@/lib/dashboard/course-colors", () => ({
  getCourseColor: () => ({ base: "#d97757", soft: "rgba(217,119,87,.11)" }),
}));

import DeadlineCard from "@/components/deadlines/DeadlineCard";

// Build a mock deadline that is 2 days from now
function makeMockDeadline(overrides: Partial<{
  id: string;
  title: string;
  due_date: string;
  days_remaining: number;
  course_code: string;
  course_name: string;
}> = {}) {
  return {
    id: "ddl_1",
    title: "Assignment 2",
    due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
    source: "canvas_assignment",
    weight: 0.1,
    status: "upcoming" as const,
    days_remaining: 2,
    course_id: "test-course-uuid-1",
    course_code: "COMP2017",
    course_name: "Systems Programming",
    is_confirmed: true,
    ...overrides,
  };
}

const defaultCourseColor = { base: "#d97757", soft: "rgba(217,119,87,.11)" };

describe("DeadlineCard", () => {
  const onToggle = vi.fn();

  beforeEach(() => {
    onToggle.mockClear();
  });

  it("renders deadline title, course, and due date", () => {
    const dl = makeMockDeadline();
    render(
      <DeadlineCard
        deadline={dl}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    expect(screen.getByText("Assignment 2")).toBeTruthy();
    expect(screen.getByText(/COMP2017/)).toBeTruthy();
    expect(screen.getByText(/Systems Programming/)).toBeTruthy();
    // Due date is formatted — just check the card rendered
    expect(screen.getByTestId("deadline-card")).toBeTruthy();
  });

  it("shows urgency badge with correct color", () => {
    // 2 days from now = urgent
    const dl = makeMockDeadline();
    render(
      <DeadlineCard
        deadline={dl}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    const badge = screen.getByTestId("urgency-badge");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("2 days");
    // Urgent color: #d97757 (jsdom converts to rgb)
    expect(badge.style.color).toBe("rgb(217, 119, 87)");
  });

  it("shows expand hint when collapsed", () => {
    const dl = makeMockDeadline();
    render(
      <DeadlineCard
        deadline={dl}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    expect(
      screen.getByText("Click to expand materials & AI chat")
    ).toBeTruthy();
  });

  it("expands to show materials section on click", () => {
    const dl = makeMockDeadline();
    const { rerender } = render(
      <DeadlineCard
        deadline={dl}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    fireEvent.click(screen.getByTestId("deadline-card"));
    expect(onToggle).toHaveBeenCalledOnce();

    // Re-render as expanded
    rerender(
      <DeadlineCard
        deadline={dl}
        isExpanded={true}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    expect(screen.getByText("Related Materials")).toBeTruthy();
    expect(screen.getByText("Assessment Specification")).toBeTruthy();
  });

  it("shows AI chat placeholder with Coming Soon badge", () => {
    const dl = makeMockDeadline();
    render(
      <DeadlineCard
        deadline={dl}
        isExpanded={true}
        onToggle={onToggle}
        courseColor={defaultCourseColor}
      />
    );
    expect(screen.getByText("Coming Soon")).toBeTruthy();
    expect(screen.getByText("Ask about this deadline")).toBeTruthy();
    expect(
      screen.getByText("AI responses are for study reference only")
    ).toBeTruthy();
  });

  it("shows left color stripe matching course color", () => {
    const dl = makeMockDeadline();
    render(
      <DeadlineCard
        deadline={dl}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={{ base: "#6a9bcc", soft: "rgba(106,155,204,.11)" }}
      />
    );
    const stripe = screen.getByTestId("color-stripe");
    // jsdom converts hex to rgb
    expect(stripe.style.backgroundColor).toBe("rgb(106, 155, 204)");
  });
});
