import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DangerZoneSection from "@/components/settings/DangerZoneSection";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${JSON.stringify(params)}${key}` : key,
}));

// Mock useDeleteToken and useDeleteAccount
const mockDeleteTokenMutate = vi.fn();
const mockDeleteAccountMutate = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useDeleteToken: () => ({
    mutate: mockDeleteTokenMutate,
    isPending: false,
  }),
  useDeleteAccount: () => ({
    mutate: mockDeleteAccountMutate,
    isPending: false,
  }),
}));

// Mock HTMLDialogElement methods (not implemented in jsdom)
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("DangerZoneSection", () => {
  it("renders disconnect tokens button", () => {
    render(<DangerZoneSection />);
    expect(screen.getByText("danger.disconnect.button")).toBeInTheDocument();
  });

  it("shows disconnect confirmation dialog when button is clicked", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);
    const disconnectBtn = screen.getByText("danger.disconnect.button");
    await user.click(disconnectBtn);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("renders delete account button", () => {
    render(<DangerZoneSection />);
    expect(screen.getByText("danger.delete.button")).toBeInTheDocument();
  });

  it("shows delete confirmation dialog with DELETE input", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);
    const deleteBtn = screen.getByText("danger.delete.button");
    await user.click(deleteBtn);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    const dialog = screen.getByTestId("delete-dialog");
    expect(within(dialog).getByTestId("delete-input")).toBeInTheDocument();
  });

  it("enables delete confirm button only when DELETE is typed", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    // Open delete dialog
    const deleteBtn = screen.getByText("danger.delete.button");
    await user.click(deleteBtn);

    const confirmBtn = screen.getByTestId("delete-confirm");
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByTestId("delete-input");
    await user.type(input, "DELETE");
    expect(confirmBtn).toBeEnabled();
  });

  it("cancels dialog when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    // Open disconnect dialog
    const disconnectBtn = screen.getByText("danger.disconnect.button");
    await user.click(disconnectBtn);

    // Click cancel in disconnect dialog
    const dialog = screen.getByTestId("disconnect-dialog");
    const cancelBtn = within(dialog).getByText("danger.disconnect.cancel");
    await user.click(cancelBtn);
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
  });
});
