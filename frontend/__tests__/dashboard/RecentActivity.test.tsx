import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import {
  mapNotificationToActivity,
  type ActivityItem,
} from "@/lib/notifications/map-to-activity";
import type { components } from "@/lib/api/types.gen";

type Notification = components["schemas"]["Notification"];

// Mock roughjs for RoughCard
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      circle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (values) {
      let result = key;
      for (const [k, v] of Object.entries(values)) {
        result = result.replace(`{${k}}`, String(v));
      }
      return result;
    }
    return key;
  },
}));

// Mock next/dynamic for SSR-safe components
vi.mock("next/dynamic", () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    let Comp: React.ComponentType | null = null;
    importFn().then((mod) => {
      Comp = mod.default;
    });
    return function DynamicMock(props: Record<string, unknown>) {
      if (Comp) return <Comp {...props} />;
      return null;
    };
  },
}));

// Mock navigation router
const mockPush = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock HTMLDialogElement.prototype.showModal (jsdom does not implement native dialog)
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
  mockPush.mockReset();
});

// Translation stub for mapNotificationToActivity
const t = (key: string) => key;

// ── mapNotificationToActivity unit tests ────────────────────────────

describe("mapNotificationToActivity", () => {
  it("grade_published returns internalPath from action_url and no externalUrl", () => {
    const n: Notification = {
      id: "ntf_grade",
      type: "grade_published",
      severity: "info",
      title: "Grade Released: COMP2017 Assignment 2",
      body: "You scored 78/100.",
      is_read: false,
      action_url: "/courses/crs_comp2017",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.internalPath).toBe("/courses/crs_comp2017");
    expect(result.externalUrl).toBeUndefined();
    expect(result.type).toBe("grade");
  });

  it("deadline_reminder returns internalPath=/deadlines and no externalUrl", () => {
    const n: Notification = {
      id: "ntf_deadline",
      type: "deadline_reminder",
      severity: "critical",
      title: "Due in 3 hours: COMP3221 Project",
      body: "Project closes tonight.",
      is_read: false,
      action_url: "/courses/crs_comp3221",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.internalPath).toBe("/deadlines");
    expect(result.externalUrl).toBeUndefined();
    expect(result.type).toBe("deadline");
  });

  it("discussion_reply with external URL returns externalUrl and no internalPath", () => {
    const n: Notification = {
      id: "ntf_disc_ext",
      type: "discussion_reply",
      severity: "info",
      title: "Reply: COMP2017 Q1",
      body: "New reply on your thread.",
      is_read: false,
      action_url: "https://edstem.org/au/courses/123/discussion/456",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.externalUrl).toBe(
      "https://edstem.org/au/courses/123/discussion/456"
    );
    expect(result.internalPath).toBeUndefined();
    expect(result.type).toBe("discussion");
  });

  it("endorsed_answer with external URL returns externalUrl and no internalPath", () => {
    const n: Notification = {
      id: "ntf_endorsed_ext",
      type: "endorsed_answer",
      severity: "info",
      title: "Endorsed: COMP2017 Q2",
      body: "Your answer was endorsed.",
      is_read: false,
      action_url: "https://edstem.org/au/courses/123/discussion/789",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.externalUrl).toBe(
      "https://edstem.org/au/courses/123/discussion/789"
    );
    expect(result.internalPath).toBeUndefined();
    expect(result.type).toBe("endorsed");
  });

  it("notification with internal path (starts with /) sets internalPath", () => {
    const n: Notification = {
      id: "ntf_disc_int",
      type: "discussion_reply",
      severity: "info",
      title: "Reply: Local Thread",
      body: "Internal discussion.",
      is_read: false,
      action_url: "/courses/crs_comp2017/discussions",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.internalPath).toBe("/courses/crs_comp2017/discussions");
    expect(result.externalUrl).toBeUndefined();
  });

  it("notification with external URL (starts with http) sets externalUrl", () => {
    const n: Notification = {
      id: "ntf_token",
      type: "token_expired",
      severity: "warning",
      title: "Token Expired",
      body: "Re-configure in Settings.",
      is_read: false,
      action_url: "https://example.com/settings",
      created_at: new Date().toISOString(),
    };
    const result = mapNotificationToActivity(n, t);
    expect(result.externalUrl).toBe("https://example.com/settings");
    expect(result.internalPath).toBeUndefined();
  });
});

// ── RecentActivity component tests ──────────────────────────────────

import RecentActivity from "@/components/dashboard/RecentActivity";

const makeActivities = (): ActivityItem[] => [
  {
    id: "a1",
    type: "grade",
    text: "Your Assignment 2 has been graded.",
    strongText: "Assignment 2",
    time: "time.justNow",
    internalPath: "/courses/crs_comp2017",
  },
  {
    id: "a2",
    type: "discussion",
    text: "New reply on Ed Discussion.",
    strongText: "Ed Discussion",
    time: "time.hoursAgo",
    externalUrl: "https://edstem.org/au/courses/123/discussion/456",
  },
  {
    id: "a3",
    type: "deadline",
    text: "Project Milestone 2 is due soon.",
    strongText: "Milestone 2",
    time: "time.daysAgo",
    internalPath: "/deadlines",
  },
  {
    id: "a4",
    type: "endorsed",
    text: "Your answer was endorsed.",
    strongText: "endorsed",
    time: "time.justNow",
  },
];

describe("RecentActivity", () => {
  it("renders all activity items", () => {
    const activities = makeActivities();
    render(<RecentActivity activities={activities} />);

    expect(screen.getByText(/Assignment 2/)).toBeDefined();
    expect(screen.getByText(/Ed Discussion/)).toBeDefined();
    expect(screen.getByText(/Milestone 2/)).toBeDefined();
  });

  it("clicking grade item calls router.push with internal path", () => {
    const activities = makeActivities();
    render(<RecentActivity activities={activities} />);

    // Grade item (a1) has internalPath
    const gradeItem = screen.getByText(/Assignment 2/).closest("[role=button]");
    expect(gradeItem).toBeDefined();
    fireEvent.click(gradeItem!);
    expect(mockPush).toHaveBeenCalledWith("/courses/crs_comp2017");
  });

  it("clicking discussion item with external URL opens ExternalLinkDialog", () => {
    const activities = makeActivities();
    render(<RecentActivity activities={activities} />);

    const discItem = screen
      .getByText(/Ed Discussion/)
      .closest("[role=button]");
    expect(discItem).toBeDefined();
    fireEvent.click(discItem!);

    // ExternalLinkDialog should be open (showModal called)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("items with internalPath have cursor-pointer and role=button", () => {
    const activities = makeActivities();
    render(<RecentActivity activities={activities} />);

    // Deadline item (a3) has internalPath
    const deadlineItem = screen
      .getByText(/Milestone 2/)
      .closest("[role=button]");
    expect(deadlineItem).toBeDefined();
    expect(deadlineItem!.className).toContain("cursor-pointer");
  });

  it("items without URL have no role=button", () => {
    const activities = makeActivities();
    render(<RecentActivity activities={activities} />);

    // Endorsed item (a4) has no URL at all - find via time text unique to a4
    const timeElements = screen.getAllByText("time.justNow");
    // a1 (grade) and a4 (endorsed) both have time.justNow; a4 is the one without role=button
    // Find the container div that does NOT have role=button among time.justNow parents
    const noRoleItems = timeElements
      .map((el) => el.closest("div[class*='flex'][class*='gap-']"))
      .filter((el) => el && !el.getAttribute("role"));
    expect(noRoleItems.length).toBeGreaterThan(0);
  });
});
