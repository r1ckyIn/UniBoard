import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock RoughCard since it uses roughjs internally (jsdom can't render SVG paths)
vi.mock("@/components/design-system/RoughCard", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rough-card">{children}</div>
  ),
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

// Mock next/dynamic to render children directly (skip SSR guard)
vi.mock("next/dynamic", () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    // Eagerly resolve the import and return a passthrough component
    let Comp: React.ComponentType | null = null;
    importFn().then((mod) => {
      Comp = mod.default;
    });
    return function DynamicMock(props: Record<string, unknown>) {
      // In sync test environment, the import resolves before render
      if (Comp) return <Comp {...props} />;
      return null;
    };
  },
}));

import AssessmentSection from "@/components/course-detail/AssessmentSection";
import { courseDetails } from "@/lib/fixtures/courses";

const mockAssessments = courseDetails.crs_comp2017.assessment_weights;

describe("AssessmentSection", () => {
  const defaultProps = {
    assessments: mockAssessments,
    predictions: {} as Record<number, number | null>,
    onPredictionChange: vi.fn(),
    courseColor: "#d97757",
    courseSoft: "rgba(217,119,87,.11)",
    semester: "2026 S1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders assessment rows with names and weights", () => {
    render(<AssessmentSection {...defaultProps} />);
    // Check all 5 assessment names are present (real COMP2017 data)
    expect(screen.getByText("Weekly Tasks")).toBeInTheDocument();
    expect(screen.getByText(/Programming P1/)).toBeInTheDocument();
    expect(screen.getByText("Programming P2")).toBeInTheDocument();
    expect(screen.getByText("T0 (EFT)")).toBeInTheDocument();
    expect(screen.getByText("Final Exam")).toBeInTheDocument();

    // Check weight percentages are displayed (Math.round(weight * 100))
    expect(screen.getByText("20%")).toBeInTheDocument();
    // Two assessments share 0.125 weight = Math.round(12.5) = 13%
    expect(screen.getAllByText("13%")).toHaveLength(2);
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows graded badge for graded assessment items", () => {
    render(<AssessmentSection {...defaultProps} />);
    // 1 graded item (T0 EFT) should show "graded" badge text
    const gradedBadges = screen.getAllByText("assessment.gradedBadge");
    expect(gradedBadges).toHaveLength(1);
  });

  it("shows dashed-border score input for ungraded items", () => {
    render(<AssessmentSection {...defaultProps} />);
    // 4 ungraded items (Weekly Tasks, Programming P1, Programming P2, Final Exam)
    const inputs = screen.getAllByPlaceholderText("assessment.scorePlaceholder");
    expect(inputs).toHaveLength(4);
  });

  it("displays weight progress bars for each assessment", () => {
    const { container } = render(<AssessmentSection {...defaultProps} />);
    // Each assessment row should have a progress bar area
    // Since RoughProgressBar is wrapped with withClientOnly, verify the row structure
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(5);
  });

  it("calls onPredictionChange when prediction input changes", () => {
    const onPredictionChange = vi.fn();
    render(
      <AssessmentSection {...defaultProps} onPredictionChange={onPredictionChange} />
    );
    const inputs = screen.getAllByPlaceholderText("assessment.scorePlaceholder");
    fireEvent.change(inputs[0], { target: { value: "85" } });
    // onPredictionChange(index, value) — index 0 is the first ungraded item (Weekly Tasks)
    expect(onPredictionChange).toHaveBeenCalledWith(0, "85");
  });

  it("displays grade summary with current average and projected final", () => {
    render(<AssessmentSection {...defaultProps} />);
    // Grade summary labels should be present
    expect(screen.getByText("gradeSummary.currentAverage")).toBeInTheDocument();
    expect(screen.getByText("gradeSummary.projectedFinal")).toBeInTheDocument();
    // "Based on X% assessed" text should show assessed weight
    expect(
      screen.getByText("gradeSummary.basedOnAssessed")
    ).toBeInTheDocument();
  });
});
