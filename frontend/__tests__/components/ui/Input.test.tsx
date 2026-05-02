/**
 * Phase 40 plan-01 — Input cva primitive unit tests (TDD RED).
 *
 * Test names map to VALIDATION.md Per-Task IDs 40-01-09..14:
 *   "default variant"   → 40-01-09
 *   "search variant"    → 40-01-10
 *   "leftIcon"          → 40-01-11
 *   "rightIcon"         → 40-01-12
 *   "error state"       → 40-01-13
 *   "disabled state"    → 40-01-14
 *
 * Per D-40-12, this RED commit lands BEFORE Task 1b GREEN implementation.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/Input";

describe("<Input>", () => {
  it("default variant", () => {
    render(<Input placeholder="email" />);
    const input = screen.getByPlaceholderText("email");
    expect(input.className).toContain("rounded-lg");
    expect(input.className).toContain("bg-cream");
  });

  it("search variant", () => {
    render(<Input variant="search" placeholder="search" />);
    const input = screen.getByPlaceholderText("search");
    expect(input.className).toContain("rounded-full");
  });

  it("leftIcon", () => {
    render(<Input leftIcon={<svg data-testid="left" />} placeholder="user" />);
    expect(screen.getByTestId("left")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("user");
    expect(input.className).toContain("pl-10");
  });

  it("rightIcon", () => {
    render(
      <Input rightIcon={<svg data-testid="right" />} placeholder="amount" />,
    );
    expect(screen.getByTestId("right")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("amount");
    expect(input.className).toContain("pr-10");
  });

  it("error state", () => {
    render(<Input error placeholder="bad" />);
    const input = screen.getByPlaceholderText("bad");
    expect(input.className).toContain("border-red");
    expect(input.className).toContain("focus:border-red");
  });

  it("disabled state", () => {
    render(<Input disabled placeholder="cannot" />);
    const input = screen.getByPlaceholderText("cannot");
    expect(input).toBeDisabled();
    // disabled:* classes present in className per Tailwind selector pattern
    expect(input.className).toContain("disabled:opacity-50");
    expect(input.className).toContain("disabled:cursor-not-allowed");
  });
});
