/**
 * Phase 40 plan-01 — Button cva primitive unit tests (TDD RED).
 *
 * Test names map to VALIDATION.md Per-Task IDs 40-01-01..08:
 *   "primary variant"             → 40-01-01
 *   "secondary variant"           → 40-01-02
 *   "ghost variant"               → 40-01-03
 *   "danger variant"              → 40-01-04
 *   "iconOnly size"               → 40-01-05
 *   "loading state"               → 40-01-06
 *   "merges caller className"     → 40-01-07
 *   "focus-visible ring"          → 40-01-08
 *
 * Per D-40-12, this RED commit lands BEFORE Task 1b GREEN implementation.
 * Source files do not yet exist — `Cannot find module '@/components/ui/Button'`
 * is the desired failure mode.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("<Button>", () => {
  it("primary variant", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain("bg-orange");
    expect(btn.className).toContain("text-white");
  });

  it("secondary variant", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const btn = screen.getByRole("button", { name: "Cancel" });
    expect(btn.className).toContain("bg-cream");
    expect(btn.className).toContain("border-card-border");
  });

  it("ghost variant", () => {
    render(<Button variant="ghost">Close</Button>);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("text-text-2");
  });

  it("danger variant", () => {
    render(<Button variant="danger">Delete</Button>);
    const btn = screen.getByRole("button", { name: "Delete" });
    expect(btn.className).toContain("bg-red");
    expect(btn.className).toContain("text-white");
  });

  it("iconOnly size", () => {
    render(
      <Button iconOnly size="md" aria-label="send">
        x
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "send" });
    expect(btn.className).toContain("aspect-square");
    expect(btn.className).toContain("px-0");
  });

  it("loading state", () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).toBeInTheDocument();
    expect(btn.className).toContain("opacity-80");
  });

  it("merges caller className", () => {
    render(<Button className="w-full extra-class">Click</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("w-full");
    expect(btn.className).toContain("extra-class");
  });

  it("focus-visible ring", () => {
    render(<Button>Focus me</Button>);
    const btn = screen.getByRole("button");
    // focus-visible:* classes appear in className even when not focused;
    // they activate via :focus-visible pseudo-class at runtime.
    expect(btn.className).toContain("focus-visible:ring-2");
    expect(btn.className).toContain("focus-visible:ring-orange/40");
    expect(btn.className).toContain("focus-visible:outline-none");
  });
});
