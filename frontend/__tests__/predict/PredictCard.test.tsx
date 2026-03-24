import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock roughjs since jsdom can't render SVG paths
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      circle: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () =>
        document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      current: "Current",
      projected: "Projected",
      "assessed": `${params?.pct ?? "0"}% assessed`,
      "gradedBadge": "graded",
      "scorePlaceholder": "?",
      "columns.assessment": "Assessment",
      "columns.weight": "Weight",
      "columns.score": "Score",
      "gradeSummary.current": "Current",
      "gradeSummary.projected": "Projected",
      "gradeSummary.assessedSub": `${params?.pct ?? "0"}% assessed`,
      "gradeSummary.gradeBand": `${params?.band ?? ""} grade band`,
      "gradeSummary.enterScores": "Enter scores above",
      "gradeSummary.note": "Projected grade updates live as you type predicted scores.",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/design-system/ClientOnly", () => ({
  withClientOnly: () => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="client-only-mock" {...props} />
    );
    MockComponent.displayName = "ClientOnlyMock";
    return MockComponent;
  },
}));

import PredictCard from "@/components/predict/PredictCard";

const mockCourse = {
  course_id: "c1",
  code: "COMP2017",
  name: "Systems Programming",
  credit_points: 6,
  level_weight: 2,
  current_mark: 78.5,
  grade_letter: "D",
  completed_weight: 0.45,
};

const mockAssessments = [
  {
    name: "Assignment 1",
    weight: 0.2,
    score: 85,
    max_score: 100,
    status: "graded" as const,
    group_name: "Assignments",
  },
  {
    name: "Midterm Exam",
    weight: 0.25,
    score: 72,
    max_score: 100,
    status: "graded" as const,
    group_name: "Exams",
  },
  {
    name: "Assignment 2",
    weight: 0.2,
    score: null,
    max_score: 100,
    status: "upcoming" as const,
    group_name: "Assignments",
  },
  {
    name: "Final Exam",
    weight: 0.35,
    score: null,
    max_score: 100,
    status: "upcoming" as const,
    group_name: "Exams",
  },
];

const mockColor = { base: "#d97757", soft: "rgba(217,119,87,.11)" };

describe("PredictCard", () => {
  it("renders collapsed card with course info and current mark", () => {
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={false}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    expect(screen.getByText("COMP2017")).toBeInTheDocument();
    expect(screen.getByTestId("predict-card")).toBeInTheDocument();
    expect(screen.getByTestId("color-stripe")).toHaveStyle({
      backgroundColor: "#d97757",
    });
    // Expanded section should have maxHeight 0 when collapsed
    expect(screen.getByTestId("expanded-section")).toHaveStyle({
      maxHeight: "0",
    });
  });

  it("expands on click showing assessment table", () => {
    const onToggle = vi.fn();
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={false}
        onToggle={onToggle}
        courseColor={mockColor}
      />
    );

    fireEvent.click(screen.getByTestId("predict-card"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows expanded state with assessment table when isExpanded is true", () => {
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={true}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    // Expanded section should have maxHeight 800px
    expect(screen.getByTestId("expanded-section")).toHaveStyle({
      maxHeight: "800px",
    });
    // Assessment table headers visible
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("shows score input for ungraded assessments", () => {
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={true}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    // Should have 2 inputs for the 2 ungraded assessments
    const input0 = screen.getByTestId("score-input-2");
    const input1 = screen.getByTestId("score-input-3");
    expect(input0).toBeInTheDocument();
    expect(input1).toBeInTheDocument();
    expect(input0).toHaveAttribute("inputMode", "decimal");
  });

  it("clamps input to 0-100 range", () => {
    const onPredictionChange = vi.fn();
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={onPredictionChange}
        isExpanded={true}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    const input = screen.getByTestId("score-input-2");
    fireEvent.change(input, { target: { value: "150" } });
    // Should clamp to 100
    expect(onPredictionChange).toHaveBeenCalledWith(2, "100");
  });

  it("shows graded badge for graded assessments", () => {
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={true}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    const badges = screen.getAllByTestId("graded-badge");
    expect(badges).toHaveLength(2); // 2 graded assessments
    expect(badges[0]).toHaveTextContent("graded");
  });

  it("displays projected mark when all predictions filled", () => {
    const predictions = { 2: 80, 3: 75 };
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={predictions}
        onPredictionChange={vi.fn()}
        isExpanded={false}
        onToggle={vi.fn()}
        courseColor={mockColor}
      />
    );

    // With all predictions filled, projected value should be computed
    // Expected: (85*0.2 + 72*0.25 + 80*0.2 + 75*0.35) / 1.0 = 77.25
    // Look for the projected value in the header
    const projected = screen.getAllByText(/\d+\.\d+%/);
    expect(projected.length).toBeGreaterThanOrEqual(2);
  });

  it("does not toggle when clicking on score input", () => {
    const onToggle = vi.fn();
    render(
      <PredictCard
        course={mockCourse}
        assessments={mockAssessments}
        predictions={{}}
        onPredictionChange={vi.fn()}
        isExpanded={true}
        onToggle={onToggle}
        courseColor={mockColor}
      />
    );

    const input = screen.getByTestId("score-input-2");
    fireEvent.click(input);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
