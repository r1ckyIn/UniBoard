import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

// Mock useUpdateProfile
const mockMutate = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import GpaTargetSection from "@/components/settings/GpaTargetSection";
import { mockUser } from "@/lib/fixtures/users";
import type { components } from "@/lib/api/types.gen";

type User = components["schemas"]["User"];

function renderGpaSection(userOverride?: Partial<User>) {
  const user = { ...mockUser, ...userOverride } as User;
  return render(<GpaTargetSection user={user} />);
}

describe("GpaTargetSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current target value from user.gpa_target", () => {
    renderGpaSection({ gpa_target: 85.0 });
    expect(screen.getByText("85.0")).toBeInTheDocument();
  });

  it("renders grade band badge matching target (HD for 85)", () => {
    renderGpaSection({ gpa_target: 85.0 });
    expect(screen.getByText("HD")).toBeInTheDocument();
  });

  it("changing slider updates displayed value", () => {
    renderGpaSection({ gpa_target: 85.0 });
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "75" } });
    expect(screen.getByText("75.0")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders USYD scale reference text", () => {
    renderGpaSection();
    expect(screen.getByText("gpa.scale")).toBeInTheDocument();
  });

  it("Save Target button calls useUpdateProfile.mutate", async () => {
    const user = userEvent.setup();
    renderGpaSection({ gpa_target: 85.0 });
    const saveBtn = screen.getByText("gpa.saveTarget");
    await user.click(saveBtn);
    expect(mockMutate).toHaveBeenCalledWith({ gpa_target: 85 });
  });
});
