import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuccessOverlay from "@/components/auth/SuccessOverlay";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "auth.success.title": "Account Created!",
      "auth.success.description":
        "Welcome to UniBoard. Let's connect your Canvas and Ed accounts to get started.",
      "auth.success.continueButton": "Continue to Setup",
    };
    return map[key] ?? key;
  },
}));

// Mock motion/react
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe("SuccessOverlay", () => {
  it("renders content when visible is true", () => {
    render(<SuccessOverlay visible={true} onContinue={vi.fn()} />);

    expect(screen.getByText("Account Created!")).toBeInTheDocument();
    expect(screen.getByText(/Welcome to UniBoard/)).toBeInTheDocument();
    expect(screen.getByText("Continue to Setup")).toBeInTheDocument();
  });

  it("does not render content when visible is false", () => {
    render(<SuccessOverlay visible={false} onContinue={vi.fn()} />);

    expect(screen.queryByText("Account Created!")).not.toBeInTheDocument();
  });

  it("calls onContinue when button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnContinue = vi.fn();
    render(<SuccessOverlay visible={true} onContinue={mockOnContinue} />);

    const button = screen.getByText("Continue to Setup");
    await user.click(button);

    expect(mockOnContinue).toHaveBeenCalled();
  });
});
