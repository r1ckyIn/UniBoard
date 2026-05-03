import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import StreamingAssistant from "@/components/shared/StreamingAssistant";

describe("<StreamingAssistant>", () => {
  it("cursor mounts when streaming", () => {
    const { container } = render(
      <StreamingAssistant content="Hello" isStreaming />,
    );
    const cursor = container.querySelector("[aria-hidden]");
    expect(cursor).toBeInTheDocument();
    expect(cursor?.tagName.toLowerCase()).toBe("span");
  });

  it("cursor unmounts on completion", () => {
    const { container, rerender } = render(
      <StreamingAssistant content="Hello" isStreaming />,
    );
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
    rerender(<StreamingAssistant content="Hello." isStreaming={false} />);
    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument();
  });

  it("Source Serif 4 body class", () => {
    const { container } = render(
      <StreamingAssistant content="Body text" isStreaming={false} />,
    );
    // Outer div is the flex justify-start wrapper; inner is the text container.
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("justify-start");
    const textContainer = outer.firstChild as HTMLElement;
    expect(textContainer.className).toContain("font-serif");
    expect(textContainer.className).toContain("text-body");
  });
});
