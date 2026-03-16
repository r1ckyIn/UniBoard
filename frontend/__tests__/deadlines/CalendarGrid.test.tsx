import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import CalendarGrid from "@/components/deadlines/CalendarGrid";

// Mock RoughCard to avoid roughjs in jsdom
vi.mock("@/components/design-system/RoughCard", () => ({
  default: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronLeft: () => <span>&lt;</span>,
  ChevronRight: () => <span>&gt;</span>,
}));

const mockDeadlines = [
  {
    id: "1",
    course_id: "c1",
    course_code: "COMP2017",
    course_name: "Systems Programming",
    title: "Lab 3",
    due_date: "2026-03-20T02:00:00Z",
    source: "canvas",
    source_tags: [] as string[],
    weight: 0.05,
    description: null,
    urgency: "warning" as const,
    is_confirmed: true,
  },
  {
    id: "2",
    course_id: "c2",
    course_code: "DATA2002",
    course_name: "Data Analytics",
    title: "Quiz 2",
    due_date: "2026-03-20T02:00:00Z",
    source: "ed_lessons",
    source_tags: [] as string[],
    weight: 0.1,
    description: null,
    urgency: "urgent" as const,
    is_confirmed: true,
  },
];

describe("CalendarGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders month/year header", () => {
    render(
      <CalendarGrid
        deadlines={[]}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );
    const header = screen.getByRole("heading");
    expect(header).toBeInTheDocument();
    // Header should contain a year (4 digits)
    expect(header.textContent).toMatch(/\d{4}/);
  });

  it("renders day-of-week headers", () => {
    render(
      <CalendarGrid
        deadlines={[]}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("calls onSelectDate when a day is clicked", () => {
    const onSelect = vi.fn();
    render(
      <CalendarGrid
        deadlines={[]}
        selectedDate={null}
        onSelectDate={onSelect}
      />
    );
    // Day 15 should exist in any month
    const day15 = screen.getByText("15");
    fireEvent.click(day15);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it("shows deadline indicators on days with deadlines", () => {
    // Set current month to March 2026 so the calendar shows the month with deadlines
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 15)); // March 15, 2026

    const { container } = render(
      <CalendarGrid
        deadlines={mockDeadlines}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    vi.useRealTimers();

    // Due to timezone differences (date-fns format uses local time),
    // the deadline dot may appear on day 20 or 21 depending on system timezone.
    // Assert that at least one deadline dot exists in the grid.
    const dots = container.querySelectorAll("[data-deadline-dot]");
    expect(dots.length).toBeGreaterThan(0);

    // Verify the dot is inside a day button with a data-day attribute in March 2026
    const dotParentButton = dots[0]?.closest("button");
    expect(dotParentButton).toBeTruthy();
    expect(dotParentButton?.getAttribute("data-day")).toMatch(/^2026-03-/);
  });

  it("navigates months with arrow buttons", () => {
    render(
      <CalendarGrid
        deadlines={[]}
        selectedDate={null}
        onSelectDate={() => {}}
      />
    );

    const prevButton = screen.getByLabelText("Previous month");
    const nextButton = screen.getByLabelText("Next month");
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();

    // Click next to advance month
    const headerBefore = screen.getByRole("heading").textContent;
    fireEvent.click(nextButton);
    const headerAfter = screen.getByRole("heading").textContent;
    expect(headerAfter).not.toBe(headerBefore);
  });

  it("toggles selection when clicking the same day twice", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <CalendarGrid
        deadlines={[]}
        selectedDate={null}
        onSelectDate={onSelect}
      />
    );

    // First click selects
    fireEvent.click(screen.getByText("10"));
    expect(onSelect).toHaveBeenCalledWith(expect.any(Date));

    // Simulate selected state and click again
    const selectedDate = onSelect.mock.calls[0][0] as Date;
    rerender(
      <CalendarGrid
        deadlines={[]}
        selectedDate={selectedDate}
        onSelectDate={onSelect}
      />
    );
    fireEvent.click(screen.getByText("10"));
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });
});
