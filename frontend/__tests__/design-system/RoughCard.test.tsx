import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock roughjs in jsdom since SVG methods are not fully supported
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "path"),
    }),
  },
}));

import RoughCard from "@/components/design-system/RoughCard";

describe("RoughCard", () => {
  it("renders children content", () => {
    render(
      <RoughCard>
        <span>Test Content</span>
      </RoughCard>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <RoughCard className="custom-class">Content</RoughCard>
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders an SVG element for the border overlay", () => {
    const { container } = render(
      <RoughCard>
        <span>Card</span>
      </RoughCard>
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("pointer-events-none");
  });
});
