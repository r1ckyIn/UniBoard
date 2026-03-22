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

  it("applies two-layer structure: outer has padding gap, inner has bg/shadow", () => {
    const { container } = render(
      <RoughCard>
        <span>Content</span>
      </RoughCard>
    );

    // Outer wrapper: padding gap for visible rough border, no bg
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("p-[10px]");
    expect(outerDiv.className).toContain("overflow-visible");
    expect(outerDiv.className).not.toContain("bg-card-bg");

    // Inner wrapper: has card bg, rounded corners, shadow
    const innerDiv = outerDiv.querySelector(
      ".bg-card-bg"
    ) as HTMLElement;
    expect(innerDiv).toBeInTheDocument();
    expect(innerDiv.className).toContain("rounded-card");
    expect(innerDiv.className).toContain("shadow-card");
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

  it("accepts custom className on outer wrapper", () => {
    const { container } = render(
      <RoughCard className="custom-class">
        <span>Content</span>
      </RoughCard>
    );

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("custom-class");
  });

  it("accepts custom padding override on inner wrapper", () => {
    const { container } = render(
      <RoughCard padding="p-4">
        <span>Content</span>
      </RoughCard>
    );

    // Padding should be on inner wrapper, not outer
    const outerDiv = container.firstChild as HTMLElement;
    const innerDiv = outerDiv.querySelector(
      ".bg-card-bg"
    ) as HTMLElement;
    expect(innerDiv.className).toContain("p-4");
  });
});
