import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
      upcomingDeadlines: "Upcoming Deadlines",
      countdownToday: "Today",
      countdownOneDay: "1 day",
    };
    if (key === "countdownDays" && params?.count !== undefined) {
      return `${params.count}d`;
    }
    return map[key] ?? key;
  },
}));

// Mock RoughCard as passthrough div
vi.mock("@/components/design-system/RoughCard", () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="rough-card" {...props}>
      {children}
    </div>
  ),
}));

// Mock course colors
vi.mock("@/lib/dashboard/course-colors", () => ({
  getCourseColor: () => ({ base: "#6a9bcc", soft: "rgba(106,155,204,.11)" }),
}));

// Mock urgency utils
vi.mock("@/lib/timetable/urgency", () => ({
  classifyUrgency: (days: number) => {
    if (days <= 2) return "urgent";
    if (days <= 4) return "warning";
    if (days <= 7) return "normal";
    return "later";
  },
  URGENCY_BADGE: {
    urgent: { bg: "rgba(217,119,87,.11)", text: "#d97757" },
    warning: { bg: "rgba(176,137,104,.11)", text: "#b08968" },
    normal: { bg: "rgba(106,155,204,.11)", text: "#6a9bcc" },
    later: { bg: "rgba(120,140,93,.11)", text: "#788c5d" },
  },
  getItemBg: () => undefined,
}));

import TimetableUpcomingDeadlines from "@/components/timetable/TimetableUpcomingDeadlines";

function makeDeadlines(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `dl-${i}`,
    title: `Assignment ${i + 1}`,
    course_code: `COMP200${i}`,
    due_date: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    days_remaining: i + 1,
  }));
}

describe("TimetableUpcomingDeadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders deadline items with title and course_code", () => {
    const deadlines = makeDeadlines(2);
    render(<TimetableUpcomingDeadlines deadlines={deadlines} />);
    expect(screen.getByText("Assignment 1")).toBeInTheDocument();
    expect(screen.getByText("COMP2000")).toBeInTheDocument();
    expect(screen.getByText("Assignment 2")).toBeInTheDocument();
    expect(screen.getByText("COMP2001")).toBeInTheDocument();
  });

  it("shows scroll indicator when content overflows", () => {
    const deadlines = makeDeadlines(8);
    const { container } = render(
      <TimetableUpcomingDeadlines deadlines={deadlines} />
    );

    // Find the scroll container (the div with overflow-y-auto)
    const scrollContainer = container.querySelector("[data-testid='deadline-scroll-container']") as HTMLElement;
    expect(scrollContainer).not.toBeNull();

    // Simulate overflow: scrollHeight > clientHeight
    Object.defineProperty(scrollContainer, "scrollHeight", { value: 600, configurable: true });
    Object.defineProperty(scrollContainer, "clientHeight", { value: 320, configurable: true });
    Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });

    // Trigger the resize observer / re-check
    act(() => {
      scrollContainer.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByTestId("scroll-indicator")).toBeInTheDocument();
  });

  it("hides scroll indicator when content does NOT overflow", () => {
    const deadlines = makeDeadlines(2);
    const { container } = render(
      <TimetableUpcomingDeadlines deadlines={deadlines} />
    );

    const scrollContainer = container.querySelector("[data-testid='deadline-scroll-container']") as HTMLElement;
    if (scrollContainer) {
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 100, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 320, configurable: true });
      Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });

      act(() => {
        scrollContainer.dispatchEvent(new Event("scroll"));
      });
    }

    expect(screen.queryByTestId("scroll-indicator")).not.toBeInTheDocument();
  });

  it("scroll indicator has data-testid='scroll-indicator'", () => {
    const deadlines = makeDeadlines(8);
    const { container } = render(
      <TimetableUpcomingDeadlines deadlines={deadlines} />
    );

    const scrollContainer = container.querySelector("[data-testid='deadline-scroll-container']") as HTMLElement;
    expect(scrollContainer).not.toBeNull();

    Object.defineProperty(scrollContainer, "scrollHeight", { value: 600, configurable: true });
    Object.defineProperty(scrollContainer, "clientHeight", { value: 320, configurable: true });
    Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });

    act(() => {
      scrollContainer.dispatchEvent(new Event("scroll"));
    });

    const indicator = screen.getByTestId("scroll-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator.style.background).toContain("linear-gradient");
  });
});
