import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock roughjs since jsdom can't render SVG paths
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      circle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

import BannerDeco from "@/components/courses/BannerDeco";

describe("BannerDeco", () => {
  it("renders an SVG element", () => {
    const { container } = render(<BannerDeco patternIndex={0} width={300} height={120} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it.each([0, 1, 2, 3, 4])("renders pattern %i without throwing", (index) => {
    expect(() => render(<BannerDeco patternIndex={index} width={300} height={120} />)).not.toThrow();
  });

  it("SVG has pointer-events none and overflow visible", () => {
    const { container } = render(<BannerDeco patternIndex={0} width={300} height={120} />);
    const svg = container.querySelector("svg");
    expect(svg?.style.pointerEvents).toBe("none");
    expect(svg?.getAttribute("class") || svg?.style.overflow).toContain("visible");
  });
});
