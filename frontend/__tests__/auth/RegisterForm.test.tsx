import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "@/components/auth/RegisterForm";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "auth.register.title": "Create your account",
      "auth.register.subtitle": "Start maximizing your GPA today",
      "auth.register.displayNameLabel": "Display Name",
      "auth.register.displayNamePlaceholder": "Ricky",
      "auth.register.emailLabel": "Email",
      "auth.register.emailPlaceholder": "you@uni.sydney.edu.au",
      "auth.register.passwordLabel": "Password",
      "auth.register.passwordPlaceholder": "At least 8 characters",
      "auth.register.confirmPasswordLabel": "Confirm Password",
      "auth.register.confirmPasswordPlaceholder": "Re-enter your password",
      "auth.register.submitButton": "Create Account",
      "auth.register.hasAccount": "Already have an account?",
      "auth.register.signIn": "Sign in",
      "auth.passwordStrength.weak": "Weak",
      "auth.passwordStrength.fair": "Fair",
      "auth.passwordStrength.good": "Good",
      "auth.passwordStrength.strong": "Strong",
      "auth.errors.registerFailed": "Registration failed. Please try again.",
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

// Mock useRegister (useLogin no longer imported by RegisterForm)
const mockRegisterMutate = vi.fn();
const mockRegisterMutation = {
  mutate: mockRegisterMutate,
  isPending: false,
  isError: false,
  error: null,
};
vi.mock("@/hooks/use-auth", () => ({
  useRegister: () => mockRegisterMutation,
}));

// Mock auth store
vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(() => ({ tokenConfigured: false }), {
    getState: () => ({ tokenConfigured: false }),
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("RegisterForm", () => {
  const mockOnSwitchToLogin = vi.fn();
  const mockOnRegisterSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterMutation.isPending = false;
    mockRegisterMutation.isError = false;
    mockRegisterMutation.error = null;
  });

  it("renders all 4 form fields", () => {
    render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    expect(screen.getByPlaceholderText("Ricky")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("you@uni.sydney.edu.au"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("At least 8 characters"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Re-enter your password"),
    ).toBeInTheDocument();
  });

  it("renders Create Account button", () => {
    render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeInTheDocument();
  });

  it("shows password strength meter when typing password", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    await user.type(passwordInput, "MyPassword1!");

    // Should show strength bars
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars.length).toBe(4);
  });

  it("shows inline error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Ricky");
    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText("Re-enter your password");

    await user.type(nameInput, "Ricky");
    await user.type(emailInput, "test@uni.sydney.edu.au");
    await user.type(passwordInput, "MyPassword1!");
    await user.type(confirmInput, "DifferentPassword!");

    const submitBtn = screen.getByRole("button", { name: "Create Account" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("calls register mutation and onRegisterSuccess on valid submit", async () => {
    // Make register mutate call onSuccess immediately
    // (Supabase auto-confirms so signUp also signs in)
    mockRegisterMutate.mockImplementation(
      (
        _body: unknown,
        opts: { onSuccess?: () => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.();
      },
    );

    const user = userEvent.setup();
    render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    const nameInput = screen.getByPlaceholderText("Ricky");
    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    const confirmInput = screen.getByPlaceholderText("Re-enter your password");

    await user.type(nameInput, "Ricky");
    await user.type(emailInput, "test@uni.sydney.edu.au");
    await user.type(passwordInput, "MyPassword1!");
    await user.type(confirmInput, "MyPassword1!");

    const submitBtn = screen.getByRole("button", { name: "Create Account" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockRegisterMutate).toHaveBeenCalledWith(
        {
          email: "test@uni.sydney.edu.au",
          password: "MyPassword1!",
          display_name: "Ricky",
        },
        expect.any(Object),
      );
    });

    // After register success, onRegisterSuccess is called directly
    // (no nested login needed -- Supabase auto-confirm signs user in)
    expect(mockOnRegisterSuccess).toHaveBeenCalled();
  });

  it("calls onSwitchToLogin when 'Sign in' link is clicked", async () => {
    const user = userEvent.setup();
    render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    const signInLink = screen.getByText("Sign in");
    await user.click(signInLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it("renders form with noValidate attribute", () => {
    const { container } = render(
      <RegisterForm
        onSwitchToLogin={mockOnSwitchToLogin}
        onRegisterSuccess={mockOnRegisterSuccess}
      />,
    );

    const form = container.querySelector("form");
    expect(form).toHaveAttribute("noValidate");
  });
});
