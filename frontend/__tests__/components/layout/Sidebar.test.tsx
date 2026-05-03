/**
 * Phase 40 plan-03 — Sidebar two-layer DOM unit tests (TDD RED).
 *
 * Test names map to VALIDATION.md Per-Task IDs 40-03-01..05 verbatim:
 *   "two-layer DOM renders"                       -> 40-03-01
 *   "outer 68px container fixed"                  -> 40-03-02
 *   "inner panel translateX collapsed default"    -> 40-03-03
 *   "active highlight inside inner panel"         -> 40-03-04
 *   "transition-claude-base"                      -> 40-03-05
 *
 * Per D-40-12, this RED commit lands BEFORE the Sidebar.tsx structural rewrite.
 * The current implementation is single-layer width-animated <aside>; these
 * assertions on inner-panel translateX + transition-claude-base are the
 * desired failure mode until Task 2 GREEN replaces the structure.
 *
 * Per checker BLOCKER-6 fix, 40-03-03 asserts Option A literal D-40-08 semantics
 * exclusively (translate-x-[-156px] + group-hover:translate-x-0). The earlier
 * Option C "group-hover:overflow-visible" alternate clause has been removed so
 * Option C cannot accidentally satisfy this test.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      dashboard: "Dashboard",
      timetable: "Timetable",
      courses: "Courses",
      deadlines: "Deadlines",
      predict: "Predict",
      digest: "Digest",
      settings: "Settings",
      // WR-07: a11y landmarks added in Phase 40 review fix.
      sidebarLandmark: "Sidebar",
      primaryNav: "Primary navigation",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement("a", { href, ...props }, children),
  usePathname: () => "/timetable",
}));

import Sidebar from "@/components/layout/Sidebar";

describe("<Sidebar>", () => {
  it("two-layer DOM renders", () => {
    const { container } = render(<Sidebar />);
    // Outer is the <aside>; inner is the first child <div>.
    const outer = container.querySelector("aside");
    expect(outer).toBeInTheDocument();
    const inner = outer?.firstElementChild;
    expect(inner).toBeInTheDocument();
    expect(inner?.tagName.toLowerCase()).toBe("div");
  });

  it("outer 68px container fixed", () => {
    const { container } = render(<Sidebar />);
    const outer = container.querySelector("aside");
    expect(outer?.className).toContain("fixed");
    expect(outer?.className).toContain("w-[var(--spacing-sidebar-w)]");
    expect(outer?.className).toContain("[contain:layout_paint]");
  });

  it("inner panel translateX collapsed default", () => {
    const { container } = render(<Sidebar />);
    const outer = container.querySelector("aside");
    const inner = outer?.firstElementChild as HTMLElement;
    // Inner panel should be 224px wide (the expanded width) and use absolute positioning.
    expect(inner.className).toContain("absolute");
    expect(inner.className).toContain("w-[var(--spacing-sidebar-w-expanded)]");
    // Per checker BLOCKER-6 fix: assertions LOCKED to Option A literal D-40-08.
    // (BLOCKER-4 fix locked Plan-3 to Option A; Option C "group-hover:overflow-visible"
    // alternate clause REMOVED so this test is Option-A-specific.)
    expect(inner.className).toContain("translate-x-[-156px]");
    expect(inner.className).toContain("group-hover:translate-x-0");
    // It must NOT animate width — outer is the layout occupier, not the animation target.
    expect(outer?.className).not.toContain("transition-[width]");
    expect(outer?.className).not.toContain("hover:w-[");
  });

  it("active highlight inside inner panel", () => {
    const { container } = render(<Sidebar />);
    const outer = container.querySelector("aside");
    const inner = outer?.firstElementChild as HTMLElement;
    // The active nav item (matching usePathname() -> "/timetable") should
    // carry the v2.0 0.18-opacity active highlight class plus text-orange,
    // RENDERED INSIDE the inner panel, not on the outer <aside>.
    // Per CR-02 fix: literal bg-[rgba(217,119,87,0.18)] is the active-state
    // contract — bg-orange-soft (0.11) was a saturation regression and is
    // intentionally NOT used here.
    const activeLink = inner.querySelector(
      "a[class*='bg-[rgba(217,119,87,0.18)]']"
    );
    expect(activeLink).toBeInTheDocument();
    expect(activeLink?.className).toContain("text-orange");
    // Outer must NOT carry the highlight directly (single source of truth — D-40-09).
    const outerHighlight = outer?.querySelector(
      ":scope > [class*='bg-[rgba(217,119,87,0.18)]']"
    );
    expect(outerHighlight).toBeNull();
  });

  it("transition-claude-base", () => {
    const { container } = render(<Sidebar />);
    const outer = container.querySelector("aside");
    const inner = outer?.firstElementChild as HTMLElement;
    // Inner panel should use the Phase 40 plan-1 @utility shorthand for the
    // base-tier motion (250ms cubic-bezier(0.165,0.85,0.45,1)). The transition
    // target is the transform property; transition-claude-base applies an
    // all-property transition with --motion-base duration.
    expect(inner.className).toContain("transition-claude-base");
  });

  it("WR-07: a11y landmarks + keyboard focus expansion", () => {
    const { container } = render(<Sidebar />);
    const outer = container.querySelector("aside");
    // Aside is now a labelled landmark (no longer a generic "complementary").
    expect(outer?.getAttribute("aria-label")).toBe("Sidebar");
    const inner = outer?.firstElementChild as HTMLElement;
    // Inner panel exposes a labelled navigation region for SR users.
    expect(inner.getAttribute("role")).toBe("navigation");
    expect(inner.getAttribute("aria-label")).toBe("Primary navigation");
    // Inner panel translates open on group-focus-within (keyboard Tab),
    // not just group-hover (mouse).
    expect(inner.className).toContain("group-focus-within:translate-x-0");
    // Nav-item label spans become visible on group-focus-within.
    const labelSpans = inner.querySelectorAll("a span");
    labelSpans.forEach((span) => {
      expect(span.className).toContain("group-focus-within:opacity-100");
    });
  });
});
