import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SetupPage from "@/components/setup/SetupPage";

// Track router.replace calls for URL update verification
const mockReplace = vi.fn();

// Mock next/navigation (useSearchParams)
let mockSearchParamStep: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "step" ? mockSearchParamStep : null),
  }),
}));

// Mock @/lib/i18n/navigation (useRouter, usePathname)
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/setup",
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? JSON.stringify(params) + key : key,
}));

// Mock motion/react -- AnimatePresence renders children, motion.div renders div
vi.mock("motion/react", () => ({
  AnimatePresence: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="animate-presence">{children}</div>,
  motion: {
    div: ({
      children,
      ...rest
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => <div data-testid={`motion-div-${rest["data-key"] ?? ""}`}>{children}</div>,
  },
}));

// Mock RoughCard
vi.mock("@/components/design-system/RoughCard", () => ({
  default: ({
    children,
    disableHover,
  }: {
    children: React.ReactNode;
    disableHover?: boolean;
  }) => (
    <div data-testid="rough-card" data-disable-hover={disableHover}>
      {children}
    </div>
  ),
}));

// Mock AnimatedEntry
vi.mock("@/components/shared/AnimatedEntry", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animated-entry">{children}</div>
  ),
}));

// Mock StepIndicator
let capturedStep: unknown = null;
vi.mock("@/components/setup/StepIndicator", () => ({
  default: ({ currentStep }: { currentStep: unknown }) => {
    capturedStep = currentStep;
    return <div data-testid="step-indicator">Step: {String(currentStep)}</div>;
  },
}));

// Mock step components
vi.mock("@/components/setup/WelcomeStep", () => ({
  default: ({ onNext }: { onNext: () => void }) => (
    <div data-testid="welcome-step">
      <span>WelcomeStep</span>
      <button onClick={onNext}>Get Started</button>
    </div>
  ),
}));

vi.mock("@/components/setup/TutorialStep", () => ({
  default: ({
    onNext,
    onBack,
  }: {
    onNext: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="tutorial-step">
      <span>TutorialStep</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>I have my tokens</button>
    </div>
  ),
}));

vi.mock("@/components/setup/TokenStep", () => ({
  default: ({
    onBack,
    onSuccess,
  }: {
    onBack: () => void;
    onSuccess: () => void;
  }) => (
    <div data-testid="token-step">
      <span>TokenStep</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onSuccess}>Validate</button>
    </div>
  ),
}));

vi.mock("@/components/setup/SuccessStep", () => ({
  default: () => (
    <div data-testid="success-step">
      <span>SuccessStep</span>
    </div>
  ),
}));

describe("SetupPage", () => {
  beforeEach(() => {
    capturedStep = null;
    mockSearchParamStep = null;
    mockReplace.mockClear();
  });

  it("shows step 1 (Welcome) on initial render", () => {
    render(<SetupPage />);

    expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
    expect(screen.queryByTestId("tutorial-step")).not.toBeInTheDocument();
    expect(capturedStep).toBe(1);
  });

  it("transitions to step 2 when Get Started is clicked", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    await user.click(screen.getByText("Get Started"));

    expect(screen.getByTestId("tutorial-step")).toBeInTheDocument();
    expect(screen.queryByTestId("welcome-step")).not.toBeInTheDocument();
    expect(capturedStep).toBe(2);
  });

  it("returns to step 1 from step 2 when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    // Go to step 2
    await user.click(screen.getByText("Get Started"));
    expect(screen.getByTestId("tutorial-step")).toBeInTheDocument();

    // Go back to step 1
    await user.click(screen.getByText("Back"));
    expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
    expect(capturedStep).toBe(1);
  });

  it("transitions to step 3 from step 2 when 'I have my tokens' is clicked", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    // Go to step 2
    await user.click(screen.getByText("Get Started"));
    // Go to step 3
    await user.click(screen.getByText("I have my tokens"));

    expect(screen.getByTestId("token-step")).toBeInTheDocument();
    expect(screen.queryByTestId("tutorial-step")).not.toBeInTheDocument();
    expect(capturedStep).toBe(3);
  });

  it("returns to step 2 from step 3 when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    // Navigate to step 3
    await user.click(screen.getByText("Get Started"));
    await user.click(screen.getByText("I have my tokens"));
    expect(screen.getByTestId("token-step")).toBeInTheDocument();

    // Go back to step 2
    await user.click(screen.getByText("Back"));
    expect(screen.getByTestId("tutorial-step")).toBeInTheDocument();
    expect(capturedStep).toBe(2);
  });

  it("transitions to success state when validation succeeds", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    // Navigate to step 3
    await user.click(screen.getByText("Get Started"));
    await user.click(screen.getByText("I have my tokens"));
    // Trigger success
    await user.click(screen.getByText("Validate"));

    expect(screen.getByTestId("success-step")).toBeInTheDocument();
    expect(capturedStep).toBe("success");
  });

  it("renders RoughCard with disableHover={true}", () => {
    render(<SetupPage />);

    const roughCard = screen.getByTestId("rough-card");
    expect(roughCard).toBeInTheDocument();
    expect(roughCard).toHaveAttribute("data-disable-hover", "true");
  });

  it("renders StepIndicator with correct currentStep", () => {
    render(<SetupPage />);

    expect(screen.getByTestId("step-indicator")).toBeInTheDocument();
    expect(screen.getByText("Step: 1")).toBeInTheDocument();
  });

  it("reads initial step from URL search param ?step=2", () => {
    mockSearchParamStep = "2";
    render(<SetupPage />);

    expect(screen.getByTestId("tutorial-step")).toBeInTheDocument();
    expect(screen.queryByTestId("welcome-step")).not.toBeInTheDocument();
    expect(capturedStep).toBe(2);
  });

  it("reads initial step from URL search param ?step=3", () => {
    mockSearchParamStep = "3";
    render(<SetupPage />);

    expect(screen.getByTestId("token-step")).toBeInTheDocument();
    expect(capturedStep).toBe(3);
  });

  it("defaults to step 1 for invalid URL search param", () => {
    mockSearchParamStep = "invalid";
    render(<SetupPage />);

    expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
    expect(capturedStep).toBe(1);
  });

  it("updates URL when step changes", async () => {
    const user = userEvent.setup();
    render(<SetupPage />);

    await user.click(screen.getByText("Get Started"));

    expect(mockReplace).toHaveBeenCalledWith("/setup?step=2", {
      scroll: false,
    });
  });
});
