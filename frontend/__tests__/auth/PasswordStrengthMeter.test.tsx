import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "auth.passwordStrength.weak": "Weak",
      "auth.passwordStrength.fair": "Fair",
      "auth.passwordStrength.good": "Good",
      "auth.passwordStrength.strong": "Strong",
    };
    return map[key] ?? key;
  },
}));

// Mock motion/react to avoid animation issues in jsdom
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

describe("PasswordStrengthMeter", () => {
  it("renders 4 bars", () => {
    const { container } = render(<PasswordStrengthMeter strength={0} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars).toHaveLength(4);
  });

  it("all bars are grey when strength is 0", () => {
    const { container } = render(<PasswordStrengthMeter strength={0} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    bars.forEach((bar) => {
      expect(bar.className).toContain("bg-divider");
    });
  });

  it("shows no label when strength is 0", () => {
    render(<PasswordStrengthMeter strength={0} />);
    expect(screen.queryByText("Weak")).not.toBeInTheDocument();
    expect(screen.queryByText("Fair")).not.toBeInTheDocument();
    expect(screen.queryByText("Good")).not.toBeInTheDocument();
    expect(screen.queryByText("Strong")).not.toBeInTheDocument();
  });

  it("shows 1 red bar and label 'Weak' when strength is 1", () => {
    const { container } = render(<PasswordStrengthMeter strength={1} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars[0].className).toContain("bg-[#cc4455]");
    expect(bars[1].className).toContain("bg-divider");
    expect(bars[2].className).toContain("bg-divider");
    expect(bars[3].className).toContain("bg-divider");
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("shows 2 amber bars and label 'Fair' when strength is 2", () => {
    const { container } = render(<PasswordStrengthMeter strength={2} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars[0].className).toContain("bg-[#b08968]");
    expect(bars[1].className).toContain("bg-[#b08968]");
    expect(bars[2].className).toContain("bg-divider");
    expect(bars[3].className).toContain("bg-divider");
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("shows 3 amber bars and label 'Good' when strength is 3", () => {
    const { container } = render(<PasswordStrengthMeter strength={3} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars[0].className).toContain("bg-[#b08968]");
    expect(bars[1].className).toContain("bg-[#b08968]");
    expect(bars[2].className).toContain("bg-[#b08968]");
    expect(bars[3].className).toContain("bg-divider");
    expect(screen.getByText("Good")).toBeInTheDocument();
  });

  it("shows 4 green bars and label 'Strong' when strength is 4", () => {
    const { container } = render(<PasswordStrengthMeter strength={4} />);
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars[0].className).toContain("bg-[#788c5d]");
    expect(bars[1].className).toContain("bg-[#788c5d]");
    expect(bars[2].className).toContain("bg-[#788c5d]");
    expect(bars[3].className).toContain("bg-[#788c5d]");
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });
});
