import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UserMessage from "@/components/shared/UserMessage";

describe("<UserMessage>", () => {
  it("right-aligned orange bubble", () => {
    const { container } = render(<UserMessage content="Hi" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("justify-end");
    const bubble = outer.firstChild as HTMLElement;
    expect(bubble.className).toContain("bg-orange");
    expect(bubble.className).toContain("text-white");
    expect(bubble.className).toContain("rounded-br-[4px]");
  });

  it("renders text content", () => {
    render(<UserMessage content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });
});
