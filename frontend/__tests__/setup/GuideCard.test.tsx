import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GuideCard from "@/components/setup/GuideCard";

// Mock next-intl -- return the key itself for easy assertion
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("GuideCard", () => {
  it("renders Canvas guide with all steps when expanded", () => {
    render(<GuideCard platform="canvas" defaultExpanded={true} />);

    // Header shows canvas name key
    expect(screen.getByText("canvas.name")).toBeInTheDocument();

    // All 5 step texts rendered
    expect(screen.getByText("canvas.steps.1")).toBeInTheDocument();
    expect(screen.getByText("canvas.steps.2")).toBeInTheDocument();
    expect(screen.getByText("canvas.steps.3")).toBeInTheDocument();
    expect(screen.getByText("canvas.steps.4")).toBeInTheDocument();
    expect(screen.getByText("canvas.steps.5")).toBeInTheDocument();

    // Chevron points down (no rotation) when expanded
    const header = screen.getByRole("button", { name: /canvas/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
  });

  it("renders Ed guide with all steps when expanded", () => {
    render(<GuideCard platform="ed" defaultExpanded={true} />);

    // Header shows ed name key
    expect(screen.getByText("ed.name")).toBeInTheDocument();

    // All 5 step texts rendered (including Australia region step)
    expect(screen.getByText("ed.steps.1")).toBeInTheDocument();
    expect(screen.getByText("ed.steps.2")).toBeInTheDocument();
    expect(screen.getByText("ed.steps.3")).toBeInTheDocument();
    expect(screen.getByText("ed.steps.4")).toBeInTheDocument();
    expect(screen.getByText("ed.steps.5")).toBeInTheDocument();
  });

  it("toggles collapsed state when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GuideCard platform="canvas" defaultExpanded={true} />);

    const header = screen.getByRole("button", { name: /canvas/i });
    expect(header).toHaveAttribute("aria-expanded", "true");

    // Content should be visible
    const content = screen.getByTestId("guide-content");
    expect(content).not.toHaveAttribute("aria-hidden", "true");

    // Click to collapse
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(content).toHaveAttribute("aria-hidden", "true");

    // Click to expand again
    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(content).not.toHaveAttribute("aria-hidden", "true");
  });

  it("allows independent collapse of multiple cards", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <div>
        <GuideCard platform="canvas" defaultExpanded={true} />
        <GuideCard platform="ed" defaultExpanded={true} />
      </div>,
    );

    const buttons = container.querySelectorAll("[role='button']");
    const canvasHeader = buttons[0] as HTMLElement;
    const edHeader = buttons[1] as HTMLElement;

    // Both start expanded
    expect(canvasHeader).toHaveAttribute("aria-expanded", "true");
    expect(edHeader).toHaveAttribute("aria-expanded", "true");

    // Collapse canvas only
    await user.click(canvasHeader);
    expect(canvasHeader).toHaveAttribute("aria-expanded", "false");
    expect(edHeader).toHaveAttribute("aria-expanded", "true");
  });

  it("starts collapsed when defaultExpanded is false", () => {
    render(<GuideCard platform="canvas" defaultExpanded={false} />);

    const header = screen.getByRole("button", { name: /canvas/i });
    expect(header).toHaveAttribute("aria-expanded", "false");

    const content = screen.getByTestId("guide-content");
    expect(content).toHaveAttribute("aria-hidden", "true");
  });
});
