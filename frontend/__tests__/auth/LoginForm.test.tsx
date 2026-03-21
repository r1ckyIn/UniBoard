import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "@/components/auth/LoginForm";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
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
      "auth.errors.forgotPasswordDemo":
        "Password reset is not available in demo mode",
      "auth.errors.forgotPasswordDemoDesc":
        "This feature will be available in a future update.",
      "auth.errors.loginFailed":
        "Invalid email or password. Please try again.",
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
const mockToast = vi.fn();
vi.mock("sonner", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock useLogin
const mockLoginMutate = vi.fn();
const mockLoginMutation = {
  mutate: mockLoginMutate,
  isPending: false,
  isError: false,
  error: null,
};
vi.mock("@/hooks/use-auth", () => ({
  useLogin: () => mockLoginMutation,
  useRegister: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth store
vi.mock("@/lib/auth/store", () => ({
  useAuthStore: Object.assign(() => ({ tokenConfigured: false }), {
    getState: () => ({ tokenConfigured: false }),
  }),
}));

describe("LoginForm", () => {
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginMutation.isPending = false;
    mockLoginMutation.isError = false;
    mockLoginMutation.error = null;
  });

  it("renders email and password fields with placeholders", () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    expect(
      screen.getByPlaceholderText("you@uni.sydney.edu.au"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter your password"),
    ).toBeInTheDocument();
  });

  it("renders Sign In button", () => {
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    expect(
      screen.getByRole("button", { name: "Sign In" }),
    ).toBeInTheDocument();
  });

  it("shows inline error on blur when email is invalid", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    await user.type(emailInput, "test@gmail.com");
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(
          "Please use your USYD student email (@uni.sydney.edu.au)",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows forgot password toast on click", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    const forgotLink = screen.getByText("Forgot password?");
    await user.click(forgotLink);

    expect(mockToast).toHaveBeenCalledWith(
      "Password reset is not available in demo mode",
      expect.objectContaining({ duration: 4000 }),
    );
  });

  it("calls useLogin mutation on valid form submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    const emailInput = screen.getByPlaceholderText("you@uni.sydney.edu.au");
    const passwordInput = screen.getByPlaceholderText("Enter your password");

    await user.type(emailInput, "student@uni.sydney.edu.au");
    await user.type(passwordInput, "MyPassword1!");

    const submitBtn = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLoginMutate).toHaveBeenCalledWith(
        { email: "student@uni.sydney.edu.au", password: "MyPassword1!" },
        expect.any(Object),
      );
    });
  });

  it("calls onSwitchToRegister when 'Create one' link is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginForm onSwitchToRegister={mockOnSwitchToRegister} />);

    const createOneLink = screen.getByText("Create one");
    await user.click(createOneLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it("renders form with noValidate attribute", () => {
    const { container } = render(
      <LoginForm onSwitchToRegister={mockOnSwitchToRegister} />,
    );

    const form = container.querySelector("form");
    expect(form).toHaveAttribute("noValidate");
  });
});
