import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "calendar.days.mon": "Mon",
      "calendar.days.tue": "Tue",
      "calendar.days.wed": "Wed",
      "calendar.days.thu": "Thu",
      "calendar.days.fri": "Fri",
      "calendar.days.sat": "Sat",
      "calendar.days.sun": "Sun",
    };
    return map[key] ?? key;
  },
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

import DeadlineCalendarView from "@/components/deadlines/DeadlineCalendarView";

const today = new Date();

const mockDeadlines = [
  {
    id: "ddl_1",
    title: "Assignment 1",
    due_date: new Date(
      today.getFullYear(),
      today.getMonth(),
      15,
      23,
      59
    ).toISOString(),
    source: "canvas_assignment",
    weight: 0.1,
    status: "upcoming" as const,
    days_remaining: 5,
    course_code: "COMP2017",
    course_name: "Systems Programming",
    is_confirmed: true,
  },
  {
    id: "ddl_2",
    title: "Quiz 1",
    due_date: new Date(
      today.getFullYear(),
      today.getMonth(),
      15,
      21,
      0
    ).toISOString(),
    source: "canvas_assignment",
    weight: 0.05,
    status: "upcoming" as const,
    days_remaining: 5,
    course_code: "COMP3221",
    course_name: "Distributed Systems",
    is_confirmed: true,
  },
];

describe("DeadlineCalendarView", () => {
  const mockOnDateFilter = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders month grid with day headers", () => {
    render(
      <DeadlineCalendarView
        deadlines={[]}
        onDateFilter={mockOnDateFilter}
        selectedDate={null}
      />
    );

    // Verify all 7 day headers are present
    expect(screen.getByText("Mon")).toBeTruthy();
    expect(screen.getByText("Tue")).toBeTruthy();
    expect(screen.getByText("Wed")).toBeTruthy();
    expect(screen.getByText("Thu")).toBeTruthy();
    expect(screen.getByText("Fri")).toBeTruthy();
    expect(screen.getByText("Sat")).toBeTruthy();
    expect(screen.getByText("Sun")).toBeTruthy();
  });

  it("highlights days with deadlines using course color dots", () => {
    render(
      <DeadlineCalendarView
        deadlines={mockDeadlines}
        onDateFilter={mockOnDateFilter}
        selectedDate={null}
      />
    );

    // Find the cell for day 15 (which has deadlines)
    const cell = screen.getByTestId("calendar-cell-15");
    expect(cell).toBeTruthy();

    // Verify deadline dots are rendered
    const dots = cell.querySelectorAll('[data-testid="deadline-dot"]');
    expect(dots.length).toBe(2); // Two unique courses: COMP2017 and COMP3221

    // Verify dot colors (jsdom converts hex to rgb)
    const dot1 = dots[0] as HTMLElement;
    const dot2 = dots[1] as HTMLElement;
    expect(
      dot1.style.backgroundColor === "rgb(217, 119, 87)" ||
        dot1.style.backgroundColor === "#d97757"
    ).toBe(true);
    expect(
      dot2.style.backgroundColor === "rgb(106, 155, 204)" ||
        dot2.style.backgroundColor === "#6a9bcc"
    ).toBe(true);
  });

  it("navigates to previous and next months", () => {
    render(
      <DeadlineCalendarView
        deadlines={[]}
        onDateFilter={mockOnDateFilter}
        selectedDate={null}
      />
    );

    const monthLabel = screen.getByTestId("month-label");
    const initialText = monthLabel.textContent;

    // Click next month
    const nextBtn = screen.getByLabelText("Next month");
    fireEvent.click(nextBtn);
    expect(monthLabel.textContent).not.toBe(initialText);

    // Click prev month to go back
    const prevBtn = screen.getByLabelText("Previous month");
    fireEvent.click(prevBtn);
    expect(monthLabel.textContent).toBe(initialText);
  });

  it("clicking a day with deadlines calls onDateFilter", () => {
    render(
      <DeadlineCalendarView
        deadlines={mockDeadlines}
        onDateFilter={mockOnDateFilter}
        selectedDate={null}
      />
    );

    // Click the cell for day 15
    const cell = screen.getByTestId("calendar-cell-15");
    fireEvent.click(cell);

    // Build expected date key
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const expectedDateKey = `${today.getFullYear()}-${month}-15`;
    expect(mockOnDateFilter).toHaveBeenCalledWith(expectedDateKey);
  });

  it("shows today indicator on current date", () => {
    render(
      <DeadlineCalendarView
        deadlines={[]}
        onDateFilter={mockOnDateFilter}
        selectedDate={null}
      />
    );

    // Today's cell should have the special test id
    const todayCell = screen.getByTestId("calendar-cell-today");
    expect(todayCell).toBeTruthy();

    // Today's day number should be displayed
    expect(todayCell.textContent).toContain(String(today.getDate()));
  });
});
