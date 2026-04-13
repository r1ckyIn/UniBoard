import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "auth.updatePassword.title": "Set new password",
      "auth.updatePassword.subtitle": "Enter your new password below",
      "auth.updatePassword.passwordLabel": "New Password",
      "auth.updatePassword.passwordPlaceholder": "At least 8 characters",
      "auth.updatePassword.confirmLabel": "Confirm New Password",
      "auth.updatePassword.confirmPlaceholder": "Re-enter your new password",
      "auth.updatePassword.submitButton": "Update Password",
      "auth.updatePassword.successTitle": "Password updated!",
      "auth.updatePassword.successMessage":
        "Your password has been updated. You can now sign in.",
      "auth.updatePassword.backToLogin": "Back to sign in",
      "auth.errors.updatePasswordFailed":
        "Failed to update password. Please try again.",
      "auth.passwordStrength.weak": "Weak",
      "auth.passwordStrength.fair": "Fair",
      "auth.passwordStrength.good": "Good",
      "auth.passwordStrength.strong": "Strong",
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

// Mock useUpdatePassword
const mockUpdateMutate = vi.fn();
const mockUpdateMutation = {
  mutate: mockUpdateMutate,
  isPending: false,
  isError: false,
  error: null,
};
vi.mock("@/hooks/use-auth", () => ({
  useUpdatePassword: () => mockUpdateMutation,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("UpdatePasswordForm", () => {
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMutation.isPending = false;
    mockUpdateMutation.isError = false;
    mockUpdateMutation.error = null;
  });

  it("renders new password and confirm password inputs", () => {
    render(<UpdatePasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(screen.getByText("Set new password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("At least 8 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Re-enter your new password"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Update Password" }),
    ).toBeInTheDocument();
  });

  it("shows validation error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<UpdatePasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText(
      "Re-enter your new password",
    );

    await user.type(passwordInput, "MyNewPass1!");
    await user.type(confirmInput, "DifferentPass!");

    const submitBtn = screen.getByRole("button", { name: "Update Password" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("calls updateUser on valid submit", async () => {
    mockUpdateMutate.mockImplementation(
      (
        _password: unknown,
        opts: { onSuccess?: () => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.();
      },
    );

    const user = userEvent.setup();
    render(<UpdatePasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText(
      "Re-enter your new password",
    );

    await user.type(passwordInput, "MyNewPass1!");
    await user.type(confirmInput, "MyNewPass1!");

    const submitBtn = screen.getByRole("button", { name: "Update Password" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        "MyNewPass1!",
        expect.any(Object),
      );
    });
  });

  it("shows success message after password update", async () => {
    mockUpdateMutate.mockImplementation(
      (
        _password: unknown,
        opts: { onSuccess?: () => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.();
      },
    );

    const user = userEvent.setup();
    render(<UpdatePasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText(
      "Re-enter your new password",
    );

    await user.type(passwordInput, "MyNewPass1!");
    await user.type(confirmInput, "MyNewPass1!");

    const submitBtn = screen.getByRole("button", { name: "Update Password" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Password updated!")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Your password has been updated. You can now sign in.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("enforces minimum password length", async () => {
    const user = userEvent.setup();
    render(<UpdatePasswordForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText(
      "Re-enter your new password",
    );

    await user.type(passwordInput, "short");
    await user.type(confirmInput, "short");

    const submitBtn = screen.getByRole("button", { name: "Update Password" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters"),
      ).toBeInTheDocument();
    });
  });
});
