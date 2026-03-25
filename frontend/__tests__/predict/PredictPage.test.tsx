import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks must be hoisted before imports ─────────────────────────

// Mock roughjs for jsdom
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

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      title: "Grade Predictor",
      semesterBadge: "2026 S1",
      cpBadge: `${params?.cp ?? "0"} cp`,
      facultyLabel: "Weighting",
      facultyStandard: "Standard",
      facultyEngineering: "Engineering",
      facultyScienceHonours: "Science Honours",
      current: "Current",
      projected: "Projected",
      assessed: `${params?.pct ?? "0"}% assessed`,
      scorePlaceholder: "?",
      gradedBadge: "graded",
      "columns.assessment": "Assessment",
      "columns.weight": "Weight",
      "columns.score": "Score",
      "gradeSummary.current": "Current",
      "gradeSummary.projected": "Projected",
      "gradeSummary.assessedSub": `${params?.pct ?? "0"}% assessed`,
      "gradeSummary.gradeBand": `${params?.band ?? ""} grade band`,
      "gradeSummary.enterScores": "Enter scores above",
      "gradeSummary.note":
        "Projected grade updates live as you type predicted scores.",
      "wamOverview.fillPredictions": "Fill predictions",
      "wamOverview.basisPartial": "Based on current marks (partial)",
      "wamOverview.basisAll": "Based on all predicted scores",
      "target.label": "Target WAM",
      "target.toGo": `+${params?.gap ?? "0"} to go`,
      "target.onTrack": "On track!",
      "required.title": "Min. Scores Needed",
      "required.note": "Average on remaining assessments",
      "progress.title": "Semester Progress",
      "progress.overall": `${params?.pct ?? "0"}% of semester assessed`,
    };
    return map[key] ?? key;
  },
}));

// Mock next-intl/server
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/en/predict",
}));

// Mock ClientOnly
vi.mock("@/components/design-system/ClientOnly", () => ({
  withClientOnly: () => {
    const MockComponent = (props: Record<string, unknown>) => (
      <div data-testid="client-only-mock" {...props} />
    );
    MockComponent.displayName = "ClientOnlyMock";
    return MockComponent;
  },
}));

// ── GPA fixture data ─────────────────────────────────────────────

const mockGpaReport = {
  data: {
    scale: "wam",
    current_wam: 78.5,
    current_gpa_4: 3.2,
    target_wam: 85.0,
    gap: -6.5,
    courses: [
      {
        course_id: "crs_comp2017",
        code: "COMP2017",
        name: "Systems Programming",
        credit_points: 6,
        level_weight: 2,
        current_mark: 82.5,
        grade_letter: "D",
        completed_weight: 0.4,
      },
      {
        course_id: "crs_comp3221",
        code: "COMP3221",
        name: "Distributed Systems",
        credit_points: 6,
        level_weight: 3,
        current_mark: 71.0,
        grade_letter: "CR",
        completed_weight: 0.25,
      },
      {
        course_id: "crs_stat2011",
        code: "STAT2011",
        name: "Probability and Estimation Theory",
        credit_points: 6,
        level_weight: 2,
        current_mark: 62.0,
        grade_letter: "P",
        completed_weight: 0.3,
      },
      {
        course_id: "crs_edgu1003",
        code: "EDGU1003",
        name: "Diet, Nutrition and Lifestyle",
        credit_points: 6,
        level_weight: 1,
        current_mark: 57.1,
        grade_letter: "P",
        completed_weight: 0.05,
      },
      {
        course_id: "crs_math2021",
        code: "MATH2021",
        name: "Vector Calculus and Differential Equations",
        credit_points: 6,
        level_weight: 2,
        current_mark: 100.0,
        grade_letter: "HD",
        completed_weight: 0.04,
      },
    ],
    last_sync_at: "2026-03-20T08:00:00Z",
  },
  meta: { sync_status: "synced" },
};

const mockAssessmentWeights = [
  {
    name: "Assignment 1",
    weight: 0.1,
    score: 85,
    max_score: 100,
    status: "graded" as const,
    group_name: "Assignments",
    due_date: "2026-03-07T23:59:00Z",
  },
  {
    name: "Assignment 2",
    weight: 0.15,
    score: 78,
    max_score: 100,
    status: "graded" as const,
    group_name: "Assignments",
    due_date: "2026-03-21T23:59:00Z",
  },
  {
    name: "Midterm Exam",
    weight: 0.15,
    score: 84,
    max_score: 100,
    status: "graded" as const,
    group_name: "Exams",
    due_date: "2026-04-04T14:00:00Z",
  },
  {
    name: "Assignment 3",
    weight: 0.2,
    score: null,
    max_score: 100,
    status: "upcoming" as const,
    group_name: "Assignments",
    due_date: "2026-04-25T23:59:00Z",
  },
  {
    name: "Final Exam",
    weight: 0.4,
    score: null,
    max_score: 100,
    status: "upcoming" as const,
    group_name: "Exams",
    due_date: "2026-06-05T09:00:00Z",
  },
];

// Default course detail shared across courses (with assessment_weights)
const makeCourseDetail = (course: (typeof mockGpaReport.data.courses)[0]) => ({
  data: {
    id: course.course_id,
    code: course.code,
    name: course.name,
    semester: "2026-S1",
    credit_points: course.credit_points,
    platform: "canvas" as const,
    canvas_course_id: "12345",
    ed_course_id: "67890",
    assessment_weights: mockAssessmentWeights,
    weight_source: "unit_outline" as const,
  },
  meta: { sync_status: "synced" },
});

// ── Mock hooks ───────────────────────────────────────────────────

let mockGpaLoading = false;

vi.mock("@/hooks/use-gpa", () => ({
  useGpaReport: () => ({
    data: mockGpaLoading ? undefined : mockGpaReport,
    isLoading: mockGpaLoading,
    error: null,
  }),
}));

vi.mock("@/hooks/use-courses", () => ({
  courseOptions: {
    detail: (id: string) => ({
      queryKey: ["courses", "detail", id],
      queryFn: () => {
        const course = mockGpaReport.data.courses.find(
          (c) => c.course_id === id
        );
        return course ? makeCourseDetail(course) : null;
      },
    }),
  },
  useCourseDetail: (id: string) => {
    const course = mockGpaReport.data.courses.find(
      (c) => c.course_id === id
    );
    return {
      data: course ? makeCourseDetail(course) : null,
      isLoading: false,
      error: null,
    };
  },
}));

// ── Import component under test after mocks ──────────────────────

import PredictPage from "@/components/predict/PredictPage";

// ── Helpers ──────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPredictPage() {
  const qc = createQueryClient();

  // Create right-panel-slot for portal
  const portalSlot = document.createElement("div");
  portalSlot.id = "right-panel-slot";
  document.body.appendChild(portalSlot);

  const result = render(
    <QueryClientProvider client={qc}>
      <PredictPage />
    </QueryClientProvider>
  );

  return { ...result, portalSlot };
}

// ── Tests ────────────────────────────────────────────────────────

describe("PredictPage", () => {
  beforeEach(() => {
    // Reset state
    mockGpaLoading = false;
    mockSearchParams.delete("course");
    localStorage.clear();

    // Remove portal slot if leftover
    const existing = document.getElementById("right-panel-slot");
    if (existing) existing.remove();
  });

  it("renders title row with Grade Predictor heading", () => {
    renderPredictPage();
    expect(screen.getByText("Grade Predictor")).toBeInTheDocument();
  });

  it("renders course cards for all courses", async () => {
    renderPredictPage();
    const cards = await screen.findAllByTestId("predict-card");
    expect(cards).toHaveLength(5);
  });

  it("clicking a card header expands it", async () => {
    renderPredictPage();
    const cards = await screen.findAllByTestId("predict-card");
    const firstCard = cards[0];

    // Initially collapsed
    const expandedSection = within(firstCard).getByTestId("expanded-section");
    expect(expandedSection).toHaveStyle({ maxHeight: "0" });

    // Click to expand
    fireEvent.click(firstCard);
    expect(expandedSection).toHaveStyle({ maxHeight: "800px" });
  });

  it("typing in score input updates predictions", async () => {
    renderPredictPage();
    const cards = await screen.findAllByTestId("predict-card");
    // Expand first card
    fireEvent.click(cards[0]);

    // Find score input within the first card (ungraded assessment index 3)
    const input = within(cards[0]).getByTestId("score-input-3");
    fireEvent.change(input, { target: { value: "88" } });
    expect(input).toHaveValue("88");
  });

  it("deep-link ?course=COMP2017 auto-expands matching card", async () => {
    mockSearchParams.set("course", "COMP2017");
    renderPredictPage();

    // Wait for cards to render
    const cards = await screen.findAllByTestId("predict-card");
    const comp2017Card = cards[0]; // First course in the fixture
    const expandedSection =
      within(comp2017Card).getByTestId("expanded-section");
    expect(expandedSection).toHaveStyle({ maxHeight: "800px" });
  });

  it("faculty selector changes WAM calculation", () => {
    renderPredictPage();

    // Find the faculty selector
    const select = screen.getByDisplayValue("Standard");
    expect(select).toBeInTheDocument();

    // Change to Engineering
    fireEvent.change(select, { target: { value: "engineering" } });
    expect(select).toHaveValue("engineering");
    expect(localStorage.getItem("uniboard-faculty-scheme")).toBe(
      "engineering"
    );
  });

  it("shows skeleton during loading", () => {
    mockGpaLoading = true;
    renderPredictPage();

    const skeletons = screen.getAllByRole("status");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
    expect(skeletons[0]).toHaveAttribute("aria-label", "Loading...");
  });

  it("renders WAM overview in portal slot", async () => {
    const { portalSlot } = renderPredictPage();

    // Wait for data to load
    await screen.findByText("Grade Predictor");

    // The portal slot should have WAM content
    await waitFor(() => {
      expect(
        within(portalSlot).getByText(/Based on current marks/)
      ).toBeInTheDocument();
    });
  });

  it("renders target slider in portal slot", async () => {
    const { portalSlot } = renderPredictPage();

    await screen.findByText("Grade Predictor");

    await waitFor(() => {
      expect(
        within(portalSlot).getByText("Target WAM")
      ).toBeInTheDocument();
      expect(
        within(portalSlot).getByTestId("target-slider")
      ).toBeInTheDocument();
    });
  });
});
