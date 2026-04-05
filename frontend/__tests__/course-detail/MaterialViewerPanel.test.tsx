import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import MaterialViewerPanel from "@/components/course-detail/MaterialViewerPanel";

describe("MaterialViewerPanel", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it("renders with title text when url is provided", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    expect(screen.getByText("Week 3 Lecture")).toBeInTheDocument();
  });

  it("renders iframe with correct src attribute matching the url prop", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    const iframe = screen.getByTitle("Week 3 Lecture") as HTMLIFrameElement;
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe.src).toBe("https://example.com/doc.pdf");
  });

  it("is hidden (has translate-x-full class) when url is null", () => {
    render(
      <MaterialViewerPanel
        url={null}
        title=""
        onClose={mockOnClose}
      />
    );
    const panel = screen.getByTestId("material-viewer-panel");
    expect(panel.className).toContain("translate-x-full");
  });

  it("is visible (has translate-x-0 class) when url is provided", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    const panel = screen.getByTestId("material-viewer-panel");
    expect(panel.className).toContain("translate-x-0");
  });

  it("calls onClose when close button is clicked", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    const closeButton = screen.getByLabelText("Close");
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("iframe has sandbox attribute with correct permissions", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    const iframe = screen.getByTitle("Week 3 Lecture") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBe(
      "allow-same-origin allow-scripts allow-popups"
    );
  });

  it("has Open in new tab fallback link with target _blank", () => {
    render(
      <MaterialViewerPanel
        url="https://example.com/doc.pdf"
        title="Week 3 Lecture"
        onClose={mockOnClose}
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/doc.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
