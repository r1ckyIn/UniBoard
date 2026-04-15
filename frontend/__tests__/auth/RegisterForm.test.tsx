import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "@/components/auth/RegisterForm";

// Mock next-intl (RegisterForm uses top-level useTranslations; UsydBanner scopes to 'auth.usydBanner')
vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    if (namespace === "auth.usydBanner") {
      const scoped: Record<string, string> = {
        body: "USYD banner body text",
        dismiss: "Dismiss",
      };
      return scoped[key] ?? key;
    }
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
      "auth.checkEmail.title": "Account created — sign in now",
      "auth.checkEmail.description":
        "Email confirmation is disabled. You can sign in immediately with the credentials you just created.",
      "auth.checkEmail.goToLogin": "Go to sign in",
      "auth.checkEmail.backToLogin": "Back to sign in",
      "auth.google.continueWith": "Continue with Google",
      "auth.google.or": "or",
      "auth.google.errorGeneric":
        "Sign-in failed — please try again or contact support.",
    };
    return map[key] ?? key;
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
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

// Mock useRegister + useGoogleLogin
const mockRegisterMutate = vi.fn();
const mockRegisterMutation = {
  mutate: mockRegisterMutate,
  isPending: false,
  isError: false,
  error: null,
};
const mockGoogleLoginMutate = vi.fn();
const mockGoogleLoginMutation = {
  mutate: mockGoogleLoginMutate,
  isPending: false,
  isError: false,
  error: null as unknown,
};
vi.mock("@/hooks/use-auth", () => ({
  useRegister: () => mockRegisterMutation,
  useGoogleLogin: () => mockGoogleLoginMutation,
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

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockRegisterMutation.isPending = false;
    mockRegisterMutation.isError = false;
    mockRegisterMutation.error = null;
    mockGoogleLoginMutation.isPending = false;
    mockGoogleLoginMutation.isError = false;
    mockGoogleLoginMutation.error = null;
  });

  it("renders all 4 form fields", () => {
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

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
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeInTheDocument();
  });

  it("shows password strength meter when typing password", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
    );

    const passwordInput = screen.getByPlaceholderText("At least 8 characters");
    await user.type(passwordInput, "MyPassword1!");

    // Should show strength bars
    const bars = container.querySelectorAll("[data-testid='pw-bar']");
    expect(bars.length).toBe(4);
  });

  it("shows inline error when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

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

  it("shows account-created UI after successful registration with 'Go to sign in' CTA", async () => {
    // Make register mutate call onSuccess immediately
    mockRegisterMutate.mockImplementation(
      (
        _body: unknown,
        opts: { onSuccess?: () => void; onError?: () => void },
      ) => {
        opts?.onSuccess?.();
      },
    );

    const user = userEvent.setup();
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

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

    // Should show new "Account created" UI (email confirmation is OFF)
    expect(
      screen.getByText("Account created — sign in now"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Email confirmation is disabled. You can sign in immediately with the credentials you just created.",
      ),
    ).toBeInTheDocument();

    // Should NOT show Phase 32 "we've sent a confirmation link" copy
    expect(
      screen.queryByText(/We've sent a confirmation link/),
    ).not.toBeInTheDocument();

    // Clicking "Go to sign in" triggers onSwitchToLogin
    const goToLoginBtn = screen.getByRole("button", { name: "Go to sign in" });
    await user.click(goToLoginBtn);
    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it("renders Continue with Google button", () => {
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("renders USYD banner", () => {
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

    expect(screen.getByText("USYD banner body text")).toBeInTheDocument();
  });

  it("calls googleLogin.mutate when Google button clicked", async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const googleBtn = screen.getByRole("button", {
      name: "Continue with Google",
    });
    await user.click(googleBtn);

    expect(mockGoogleLoginMutate).toHaveBeenCalled();
  });

  it("calls onSwitchToLogin when 'Sign in' link is clicked", async () => {
    const user = userEvent.setup();
    render(<RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />);

    const signInLink = screen.getByText("Sign in");
    await user.click(signInLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it("renders form with noValidate attribute", () => {
    const { container } = render(
      <RegisterForm onSwitchToLogin={mockOnSwitchToLogin} />,
    );

    const form = container.querySelector("form");
    expect(form).toHaveAttribute("noValidate");
  });
});
