import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

// Mock ExternalLinkDialog to a simplified version
vi.mock("@/components/dashboard/ExternalLinkDialog", () => ({
  default: ({
    open,
    url,
    onCancel,
    onConfirm,
  }: {
    open: boolean;
    url: string;
    onCancel: () => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="external-link-dialog" data-url={url}>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

import QuickLinksPanel from "@/components/course-detail/QuickLinksPanel";

describe("QuickLinksPanel", () => {
  const defaultProps = {
    courseCode: "COMP3221",
    canvasCourseId: "12345",
    edCourseId: "67890",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Canvas Home, Ed Discussion, Ed Lessons links", () => {
    render(<QuickLinksPanel {...defaultProps} />);
    expect(screen.getByText("quickLinks.canvas")).toBeInTheDocument();
    expect(screen.getByText("quickLinks.edDiscussion")).toBeInTheDocument();
    expect(screen.getByText("quickLinks.edLessons")).toBeInTheDocument();
  });

  it("opens ExternalLinkDialog on link click", () => {
    render(<QuickLinksPanel {...defaultProps} />);
    // Click the Canvas Home link button
    const canvasLink = screen.getByText("quickLinks.canvas");
    fireEvent.click(canvasLink.closest("button")!);
    // Dialog should appear
    expect(screen.getByTestId("external-link-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("external-link-dialog")).toHaveAttribute(
      "data-url",
      "https://canvas.sydney.edu.au/courses/12345"
    );
  });

  it("shows correct colored icon backgrounds for each link type", () => {
    const { container } = render(<QuickLinksPanel {...defaultProps} />);
    const iconContainers = container.querySelectorAll(".rp-link-icon");
    expect(iconContainers).toHaveLength(3);

    // Canvas: red background
    expect((iconContainers[0] as HTMLElement).style.background).toBe(
      "rgba(217, 60, 50, 0.08)"
    );
    // Ed Discussion: blue background
    expect((iconContainers[1] as HTMLElement).style.background).toBe(
      "rgba(106, 155, 204, 0.11)"
    );
    // Ed Lessons: green background
    expect((iconContainers[2] as HTMLElement).style.background).toBe(
      "rgba(120, 140, 93, 0.11)"
    );
  });
});
