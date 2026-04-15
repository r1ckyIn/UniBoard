import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthFormCard from "@/components/auth/AuthFormCard";

// Mock next-intl
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace?: string) => (key: string) => {
    if (namespace === "auth.usydBanner") {
      const scoped: Record<string, string> = {
        body: "USYD banner body",
        dismiss: "Dismiss",
      };
      return scoped[key] ?? key;
    }
    const map: Record<string, string> = {
      "auth.google.continueWith": "Continue with Google",
      "auth.google.or": "or",
      "auth.google.errorGeneric": "Sign-in failed",
      "auth.login.title": "Welcome back",
      "auth.login.subtitle": "Sign in to continue to your dashboard",
      "auth.login.emailLabel": "Email",
      "auth.login.emailPlaceholder": "you@uni.sydney.edu.au",
      "auth.login.passwordLabel": "Password",
      "auth.login.passwordPlaceholder": "Enter your password",
      "auth.login.forgotPassword": "Forgot password?",
      "auth.login.submitButton": "Sign In",
      "auth.login.noAccount": "Don't have an account?",
      "auth.login.createOne": "Create one",
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
      "auth.errors.forgotPasswordDemo":
        "Password reset is not available in demo mode",
      "auth.errors.forgotPasswordDemoDesc":
        "This feature will be available in a future update.",
      "auth.errors.loginFailed":
        "Invalid email or password. Please try again.",
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

// Mock sonner
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock auth hooks
vi.mock("@/hooks/use-auth", () => ({
  useLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useResetPassword: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useUpdatePassword: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useGoogleLogin: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
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

// Mock roughjs
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

describe("AuthFormCard", () => {
  it("renders LoginForm by default when mode is login", () => {
    render(
      <AuthFormCard
        mode="login"
        onSwitchMode={vi.fn()}
              />,
    );

    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders RegisterForm when mode is register", () => {
    render(
      <AuthFormCard
        mode="register"
        onSwitchMode={vi.fn()}
              />,
    );

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" }),
    ).toBeInTheDocument();
  });

  it("calls onSwitchMode when bottom link is clicked in login mode", async () => {
    const user = userEvent.setup();
    const mockOnSwitchMode = vi.fn();
    render(
      <AuthFormCard
        mode="login"
        onSwitchMode={mockOnSwitchMode}
              />,
    );

    const createOneLink = screen.getByText("Create one");
    await user.click(createOneLink);

    expect(mockOnSwitchMode).toHaveBeenCalledWith("register");
  });

  it("calls onSwitchMode when bottom link is clicked in register mode", async () => {
    const user = userEvent.setup();
    const mockOnSwitchMode = vi.fn();
    render(
      <AuthFormCard
        mode="register"
        onSwitchMode={mockOnSwitchMode}
              />,
    );

    const signInLink = screen.getByText("Sign in");
    await user.click(signInLink);

    expect(mockOnSwitchMode).toHaveBeenCalledWith("login");
  });
});
