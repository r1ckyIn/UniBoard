import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StepIndicator from "@/components/setup/StepIndicator";

describe("StepIndicator", () => {
  it("renders step 1 active state correctly", () => {
    render(<StepIndicator currentStep={1} />);

    const container = screen.getByRole("group", {
      name: "Setup progress",
    });
    expect(container).toBeInTheDocument();

    // Step 1 should be active (orange)
    const step1 = screen.getByLabelText("Step 1");
    expect(step1).toHaveTextContent("1");
    expect(step1.className).toContain("bg-[#d97757]");

    // Step 2 should be upcoming (border only)
    const step2 = screen.getByLabelText("Step 2");
    expect(step2).toHaveTextContent("2");
    expect(step2.className).toContain("border-card-border");
    expect(step2.className).not.toContain("bg-[#d97757]");
    expect(step2.className).not.toContain("bg-[#788c5d]");

    // Step 3 should be upcoming (border only)
    const step3 = screen.getByLabelText("Step 3");
    expect(step3).toHaveTextContent("3");
    expect(step3.className).toContain("border-card-border");

    // Both lines should be upcoming (card-border)
    const lines = container.querySelectorAll('[data-testid^="step-line-"]');
    expect(lines).toHaveLength(2);
    expect(lines[0].className).toContain("bg-card-border");
    expect(lines[1].className).toContain("bg-card-border");
  });

  it("renders step 2 active state correctly", () => {
    render(<StepIndicator currentStep={2} />);

    // Step 1 should be completed (green + check icon)
    const step1 = screen.getByLabelText("Step 1");
    expect(step1.className).toContain("bg-[#788c5d]");
    expect(step1.querySelector("svg")).toBeInTheDocument();
    expect(step1).not.toHaveTextContent("1");

    // Step 2 should be active (orange)
    const step2 = screen.getByLabelText("Step 2");
    expect(step2).toHaveTextContent("2");
    expect(step2.className).toContain("bg-[#d97757]");

    // Step 3 should be upcoming
    const step3 = screen.getByLabelText("Step 3");
    expect(step3).toHaveTextContent("3");
    expect(step3.className).toContain("border-card-border");

    // First line green, second line card-border
    const container = screen.getByRole("group", {
      name: "Setup progress",
    });
    const lines = container.querySelectorAll('[data-testid^="step-line-"]');
    expect(lines[0].className).toContain("bg-[#788c5d]");
    expect(lines[1].className).toContain("bg-card-border");
  });

  it("renders step 3 active state correctly", () => {
    render(<StepIndicator currentStep={3} />);

    // Step 1 and 2 should be completed (green + check icon)
    const step1 = screen.getByLabelText("Step 1");
    expect(step1.className).toContain("bg-[#788c5d]");
    expect(step1.querySelector("svg")).toBeInTheDocument();

    const step2 = screen.getByLabelText("Step 2");
    expect(step2.className).toContain("bg-[#788c5d]");
    expect(step2.querySelector("svg")).toBeInTheDocument();

    // Step 3 should be active (orange)
    const step3 = screen.getByLabelText("Step 3");
    expect(step3).toHaveTextContent("3");
    expect(step3.className).toContain("bg-[#d97757]");

    // Both lines green
    const container = screen.getByRole("group", {
      name: "Setup progress",
    });
    const lines = container.querySelectorAll('[data-testid^="step-line-"]');
    expect(lines[0].className).toContain("bg-[#788c5d]");
    expect(lines[1].className).toContain("bg-[#788c5d]");
  });

  it("renders success state with all circles completed", () => {
    render(<StepIndicator currentStep="success" />);

    // All 3 circles should be completed (green + check icons)
    const step1 = screen.getByLabelText("Step 1");
    expect(step1.className).toContain("bg-[#788c5d]");
    expect(step1.querySelector("svg")).toBeInTheDocument();

    const step2 = screen.getByLabelText("Step 2");
    expect(step2.className).toContain("bg-[#788c5d]");
    expect(step2.querySelector("svg")).toBeInTheDocument();

    const step3 = screen.getByLabelText("Step 3");
    expect(step3.className).toContain("bg-[#788c5d]");
    expect(step3.querySelector("svg")).toBeInTheDocument();

    // Both lines green
    const container = screen.getByRole("group", {
      name: "Setup progress",
    });
    const lines = container.querySelectorAll('[data-testid^="step-line-"]');
    expect(lines[0].className).toContain("bg-[#788c5d]");
    expect(lines[1].className).toContain("bg-[#788c5d]");
  });

  it("has proper accessibility attributes on all circles", () => {
    render(<StepIndicator currentStep={1} />);

    expect(screen.getByLabelText("Step 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 3")).toBeInTheDocument();
  });
});
