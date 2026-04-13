import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "auth.forgotPassword.title": "Reset your password",
      "auth.forgotPassword.subtitle":
        "Enter your email and we'll send you a reset link",
      "auth.forgotPassword.emailLabel": "Email",
      "auth.forgotPassword.emailPlaceholder": "you@uni.sydney.edu.au",
      "auth.forgotPassword.submitButton": "Send Reset Link",
      "auth.forgotPassword.backToLogin": "Back to sign in",
      "auth.forgotPassword.successTitle": "Check your email",
      "auth.forgotPassword.successMessage":
        "We've sent a password reset link to your email address.",
      "auth.errors.resetFailed":
        "Failed to send reset email. Please try again.",
      "auth.validation.emailRequired": "Email is required",
      "auth.validation.emailInvalid": "Invalid email format",
      "auth.validation.emailDomain":
        "Please use your USYD student email (@uni.sydney.edu.au)",
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

// Mock useResetPassword
const mockResetMutate = vi.fn();
const mockResetMutation = {
  mutate: mockResetMutate,
  isPending: false,
  isError: false,
  error: null as Error | null,
};
vi.mock("@/hooks/use-auth", () => ({
  useResetPassword: () => mockResetMutation,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("ForgotPasswordForm", () => {
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetMutation.isPending = false;
    mockResetMutation.isError = false;
    mockResetMutation.error = null;
  });

  it("renders email input and submit button with correct text", () => {
    render(<ForgotPasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(screen.getByText("Reset your password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("you@uni.sydney.edu.au"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Reset Link" }),
    ).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    await user.type(emailInput, "test@gmail.com");

    const submitBtn = screen.getByRole("button", { name: "Send Reset Link" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Please use your USYD student email (@uni.sydney.edu.au)",
        ),
      ).toBeInTheDocument();
    });
  });

  it("calls resetPasswordForEmail on valid submit and shows success message", async () => {
    mockResetMutate.mockImplementation(
      (
        _email: unknown,
        opts: { onSuccess?: () => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.();
      },
    );

    const user = userEvent.setup();
    render(<ForgotPasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    await user.type(emailInput, "student@uni.sydney.edu.au");

    const submitBtn = screen.getByRole("button", { name: "Send Reset Link" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockResetMutate).toHaveBeenCalledWith(
        "student@uni.sydney.edu.au",
        expect.any(Object),
      );
    });

    // Should show success UI
    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We've sent a password reset link to your email address.",
      ),
    ).toBeInTheDocument();
  });

  it("calls onSwitchToLogin when 'Back to sign in' is clicked", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const backLink = screen.getByText("Back to sign in");
    await user.click(backLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it("shows API error message when mutation fails", () => {
    mockResetMutation.isError = true;
    mockResetMutation.error = new Error("Failed");

    render(<ForgotPasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(
      screen.getByText("Failed to send reset email. Please try again."),
    ).toBeInTheDocument();
  });
});
