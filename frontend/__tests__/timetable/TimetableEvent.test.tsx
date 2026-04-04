import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock router
const mockPush = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock course colors
vi.mock("@/lib/dashboard/course-colors", () => ({
  getCourseColor: () => ({ base: "#6a9bcc", soft: "rgba(106,155,204,.11)" }),
}));

// Mock time-utils
vi.mock("@/lib/timetable/time-utils", () => ({
  formatTime: (h: number) => `${h}:00`,
}));

import TimetableEvent from "@/components/timetable/TimetableEvent";

const mockSession = {
  id: "s1",
  course_code: "COMP2017",
  course_name: "Systems Programming",
  type: "Lecture",
  section: "LE01",
  day: 0,
  start_hour: 9,
  end_hour: 11,
  location: "Room 200",
  weeks: [1, 2, 3, 4, 5],
};

describe("TimetableEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders solid borderLeft when hasAttendance is true", () => {
    const { container } = render(
      <TimetableEvent
        session={mockSession}
        top={60}
        height={120}
        hasAttendance={true}
      />
    );
    const eventDiv = container.firstChild as HTMLElement;
    expect(eventDiv.style.borderLeft).toContain("solid");
  });

  it("renders dashed borderLeft when hasAttendance is false", () => {
    const { container } = render(
      <TimetableEvent
        session={mockSession}
        top={60}
        height={120}
        hasAttendance={false}
      />
    );
    const eventDiv = container.firstChild as HTMLElement;
    expect(eventDiv.style.borderLeft).toContain("dashed");
  });

  it("renders dashed borderLeft when hasAttendance is undefined (default)", () => {
    const { container } = render(
      <TimetableEvent
        session={mockSession}
        top={60}
        height={120}
      />
    );
    const eventDiv = container.firstChild as HTMLElement;
    expect(eventDiv.style.borderLeft).toContain("dashed");
  });

  it("renders course_code, course_name, type, and section text", () => {
    render(
      <TimetableEvent
        session={mockSession}
        top={60}
        height={120}
        hasAttendance={true}
      />
    );
    expect(screen.getByText("COMP2017")).toBeInTheDocument();
    expect(screen.getByText("Systems Programming")).toBeInTheDocument();
    expect(screen.getByText("Lecture LE01")).toBeInTheDocument();
  });
});
