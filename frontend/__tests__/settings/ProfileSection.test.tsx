import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileSection from "@/components/settings/ProfileSection";
import { mockUser } from "@/lib/fixtures/users";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${JSON.stringify(params)}${key}` : key,
}));

// Mock useUpdateProfile
const mockMutate = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileSection", () => {
  it("renders display name input with current value", () => {
    render(<ProfileSection user={mockUser} />);
    const input = screen.getByDisplayValue("Alex Chen");
    expect(input).toBeInTheDocument();
  });

  it("renders email field as readonly", () => {
    render(<ProfileSection user={mockUser} />);
    const emailInput = screen.getByDisplayValue("student@sydney.edu.au");
    expect(emailInput).toHaveAttribute("readOnly");
  });

  it("shows email hint that email cannot be changed", () => {
    render(<ProfileSection user={mockUser} />);
    expect(screen.getByText("profile.emailHint")).toBeInTheDocument();
  });

  it("saves display name changes when save button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProfileSection user={mockUser} />);
    const input = screen.getByDisplayValue("Alex Chen");
    await user.clear(input);
    await user.type(input, "New Name");
    const saveBtn = screen.getByText("profile.saveChanges");
    await user.click(saveBtn);
    expect(mockMutate).toHaveBeenCalledWith({ display_name: "New Name" });
  });

  it("renders password section as disabled with coming soon hint", () => {
    render(<ProfileSection user={mockUser} />);
    expect(screen.getByText("profile.passwordHint")).toBeInTheDocument();
  });

  it("displays account created date", () => {
    render(<ProfileSection user={mockUser} />);
    // user.created_at = "2026-02-01T00:00:00Z" -> "1 Feb 2026"
    expect(screen.getByText(/1 Feb 2026/)).toBeInTheDocument();
  });
});
