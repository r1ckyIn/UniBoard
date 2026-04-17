/**
 * Tests for StudyRecCard Top-3 list (AIFEAT-01 / Phase 34 Plan 34-05).
 *
 * Verifies the component:
 * 1. Renders Top-3 items with course color dot + assessment + weight pill
 * 2. Renders empty state when items=[]
 * 3. Renders skeleton state when isLoading=true
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import StudyRecCard from "@/components/predict/StudyRecCard";
import type { StudyRecItem } from "@/components/predict/StudyRecCard";

const sampleItem: StudyRecItem = {
  course_code: "COMP3221",
  assessment_name: "Quiz 3",
  weight: 0.15,
  days_until_due: 1.0,
  roi_score: 2.4,
  score: 0.6,
};

describe("StudyRecCard", () => {
  it("renders Top-3 items with assessment name and weight pill (AIFEAT-01)", () => {
    const items: StudyRecItem[] = [
      sampleItem,
      { ...sampleItem, course_code: "STAT2011", assessment_name: "Assignment 2", weight: 0.25, days_until_due: 5 },
      { ...sampleItem, course_code: "EDGU1003", assessment_name: "Reflection", weight: 0.10, days_until_due: 10 },
    ];
    render(<StudyRecCard items={items} />);

    // All 3 assessment names visible
    expect(screen.getByText("Quiz 3")).toBeInTheDocument();
    expect(screen.getByText("Assignment 2")).toBeInTheDocument();
    expect(screen.getByText("Reflection")).toBeInTheDocument();

    // Course codes visible
    expect(screen.getByText("COMP3221")).toBeInTheDocument();

    // Weight pill rendered via i18n mock: key "weight" with {pct} param
    // Mock returns `weight:{"pct":15}` etc.
    expect(screen.getByText(/"pct":15/)).toBeInTheDocument();
    expect(screen.getByText(/"pct":25/)).toBeInTheDocument();
    expect(screen.getByText(/"pct":10/)).toBeInTheDocument();
  });

  it("renders empty state when items array is empty", () => {
    render(<StudyRecCard items={[]} />);
    // Empty text uses i18n key "empty"
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("renders skeleton state when isLoading=true", () => {
    const { container } = render(<StudyRecCard items={[]} isLoading />);
    // Skeleton placeholders use animate-pulse class
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
