/**
 * Tests for MultiCoursePathCard (AIFEAT-03 / Phase 34 Plan 34-05).
 *
 * Verifies the component:
 * 1. Green Reachable badge + required_avg line when is_achievable=true
 * 2. Advisory paragraph HIDDEN when advisory_text=null (D-D1 silent fallback)
 * 3. Red Unreachable badge + suggested_target rendered when is_achievable=false
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import MultiCoursePathCard from "@/components/predict/MultiCoursePathCard";
import type { MultiCoursePathData } from "@/components/predict/MultiCoursePathCard";

const reachablePath: MultiCoursePathData = {
  target_wam: 78,
  current_wam: 75,
  is_achievable: true,
  required_avg: 81.0,
  max_reachable: 90.0,
  suggested_target: null,
  advisory_text: "Focus on high-weight assessments this semester to close the gap.",
  language: "en",
};

describe("MultiCoursePathCard", () => {
  it("renders green Reachable badge when is_achievable=true (AIFEAT-03)", () => {
    render(<MultiCoursePathCard path={reachablePath} remainingCp={72} />);
    // Reachable key rendered in the verdict badge
    expect(screen.getByText("reachable")).toBeInTheDocument();
    // Required avg line rendered (mock i18n emits key + params)
    expect(screen.getByText(/"requiredAvg":"81.0"/)).toBeInTheDocument();
  });

  it("hides advisory paragraph when advisory_text is null (D-D1 silent fallback)", () => {
    const silent: MultiCoursePathData = { ...reachablePath, advisory_text: null };
    const { container } = render(
      <MultiCoursePathCard path={silent} remainingCp={72} />,
    );
    // No <p> with italic advisory text should be present
    const italics = container.querySelectorAll("p.italic");
    expect(italics.length).toBe(0);
  });

  it("renders Unreachable badge with suggested_target when is_achievable=false", () => {
    const unreachable: MultiCoursePathData = {
      target_wam: 85,
      current_wam: 60,
      is_achievable: false,
      required_avg: null,
      max_reachable: 80.0,
      suggested_target: 75,
      advisory_text: null,
      language: "en",
    };
    render(<MultiCoursePathCard path={unreachable} remainingCp={72} />);
    // Unreachable key with suggested param surfaces
    expect(screen.getByText(/"suggested":75/)).toBeInTheDocument();
    // maxReachable line rendered
    expect(screen.getByText(/"value":"80.0"/)).toBeInTheDocument();
  });
});
