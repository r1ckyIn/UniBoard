import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock roughjs (not available in jsdom — no real SVG rendering)
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

import RoughCard from "@/components/design-system/RoughCard";

describe("RoughCard", () => {
  it("renders children content", () => {
    render(
      <RoughCard>
        <span data-testid="card-child">Hello Card</span>
      </RoughCard>
    );

    expect(screen.getByTestId("card-child")).toBeInTheDocument();
    expect(screen.getByText("Hello Card")).toBeInTheDocument();
  });

  it("applies default styling classes", () => {
    const { container } = render(
      <RoughCard>
        <span>Content</span>
      </RoughCard>
    );

    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.className).toContain("bg-card-bg");
    expect(cardDiv.className).toContain("rounded-card");
    expect(cardDiv.className).toContain("shadow-card");
  });

  it("renders SVG element for hand-drawn border", () => {
    const { container } = render(
      <RoughCard>
        <span>Content</span>
      </RoughCard>
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    // SVG className is SVGAnimatedString in jsdom, use getAttribute instead
    const svgClass = svg?.getAttribute("class") || "";
    expect(svgClass).toContain("pointer-events-none");
    expect(svgClass).toContain("z-[2]");
  });

  it("accepts custom className", () => {
    const { container } = render(
      <RoughCard className="custom-class">
        <span>Content</span>
      </RoughCard>
    );

    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.className).toContain("custom-class");
  });

  it("accepts custom padding override", () => {
    const { container } = render(
      <RoughCard padding="p-4">
        <span>Content</span>
      </RoughCard>
    );

    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.className).toContain("p-4");
  });
});
