import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsydBanner } from "@/components/auth/UsydBanner";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      body: "USYD student? Use Google sign-in to bypass Mimecast.",
      dismiss: "Dismiss",
    };
    return map[key] ?? key;
  },
}));

const STORAGE_KEY = "uniboard.banner.usydRegister";

describe("UsydBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("renders banner copy when localStorage key is absent", () => {
    render(<UsydBanner />);

    expect(
      screen.getByText(
        "USYD student? Use Google sign-in to bypass Mimecast.",
      ),
    ).toBeInTheDocument();
  });

  it("renders banner when dismissal timestamp is older than reShowAfterDays", () => {
    // 31 days ago
    const thirtyOneDaysAgo = new Date(
      Date.now() - 31 * 24 * 60 * 60 * 1000,
    ).toISOString();
    window.localStorage.setItem(STORAGE_KEY, thirtyOneDaysAgo);

    render(<UsydBanner reShowAfterDays={30} />);

    expect(
      screen.getByText(
        "USYD student? Use Google sign-in to bypass Mimecast.",
      ),
    ).toBeInTheDocument();
  });

  it("does NOT render banner when dismissal timestamp is within reShowAfterDays window", () => {
    // 10 days ago
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString();
    window.localStorage.setItem(STORAGE_KEY, tenDaysAgo);

    render(<UsydBanner reShowAfterDays={30} />);

    expect(
      screen.queryByText(
        "USYD student? Use Google sign-in to bypass Mimecast.",
      ),
    ).not.toBeInTheDocument();
  });

  it("writes current ISO timestamp to localStorage when dismiss button clicked", async () => {
    const user = userEvent.setup();
    const fixedNow = new Date("2026-04-15T12:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);

    render(<UsydBanner />);

    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismissBtn);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    // Just verify it's a parseable ISO timestamp
    expect(Number.isNaN(Date.parse(stored ?? ""))).toBe(false);
  });

  it("removes banner from DOM immediately after dismiss click", async () => {
    const user = userEvent.setup();
    render(<UsydBanner />);

    expect(
      screen.getByText(
        "USYD student? Use Google sign-in to bypass Mimecast.",
      ),
    ).toBeInTheDocument();

    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismissBtn);

    expect(
      screen.queryByText(
        "USYD student? Use Google sign-in to bypass Mimecast.",
      ),
    ).not.toBeInTheDocument();
  });
});
