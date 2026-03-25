import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock roughjs since jsdom can't render SVG paths
vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      circle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      line: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      path: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
      polygon: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
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

// Mock createPortal to render inline (no #right-panel-slot in test DOM)
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock navigation
const mockPush = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── Mock fixture data ────────────────────────────────────────────
import { courseDetails } from "@/lib/fixtures/courses";
import { materialsByCourse } from "@/lib/fixtures/materials";

const mockCourse = courseDetails.crs_comp2017;
const mockMaterials = materialsByCourse.crs_comp2017;

// Mock hooks
vi.mock("@/hooks/use-courses", () => ({
  useCourseDetail: vi.fn(() => ({
    data: { data: mockCourse, meta: { timestamp: "" } },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/use-materials", () => ({
  useCourseMaterials: vi.fn(() => ({
    data: { data: mockMaterials, meta: { timestamp: "" } },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/use-deadlines", () => ({
  useCourseDeadlines: vi.fn(() => ({
    data: { data: [], meta: { timestamp: "" } },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("@/hooks/use-discussions", () => ({
  useCourseDiscussions: vi.fn(() => ({
    data: { data: [], meta: { timestamp: "" } },
    isLoading: false,
    error: null,
  })),
}));

// Mock child components to simple data-testid divs
vi.mock("@/components/course-detail/CourseBanner", () => ({
  default: (props: { courseCode: string; courseName: string }) => (
    <div data-testid="course-banner">
      {props.courseCode} - {props.courseName}
    </div>
  ),
}));

vi.mock("@/components/course-detail/AssessmentSection", () => ({
  default: () => <div data-testid="assessment-section">Assessment</div>,
}));

vi.mock("@/components/course-detail/MaterialsSection", () => ({
  default: () => <div data-testid="materials-section">Materials</div>,
}));

vi.mock("@/components/course-detail/AiChatPlaceholder", () => ({
  default: (props: { courseCode: string }) => (
    <div data-testid="ai-chat-placeholder">
      {props.courseCode} - aiChat.comingSoon
    </div>
  ),
}));

vi.mock("@/components/course-detail/QuickLinksPanel", () => ({
  default: () => <div data-testid="quick-links-panel">Quick Links</div>,
}));

vi.mock("@/components/course-detail/CourseDeadlinesPanel", () => ({
  default: () => <div data-testid="course-deadlines-panel">Deadlines</div>,
}));

vi.mock("@/components/course-detail/CourseActivityPanel", () => ({
  default: () => <div data-testid="course-activity-panel">Activity</div>,
}));

vi.mock("@/components/dashboard/ExternalLinkDialog", () => ({
  default: () => null,
}));

import CourseDetailPage from "@/components/course-detail/CourseDetailPage";

describe("CourseDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders back link navigating to /courses", () => {
    render(<CourseDetailPage courseId="crs_comp2017" />);
    // Back link text from i18n returns the key
    const backLink = screen.getByText("backLink");
    expect(backLink).toBeInTheDocument();
    // Click triggers navigation
    backLink.closest("button")?.click();
    expect(mockPush).toHaveBeenCalledWith("/courses");
  });

  it("renders course banner with code and name", () => {
    render(<CourseDetailPage courseId="crs_comp2017" />);
    const banner = screen.getByTestId("course-banner");
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain("COMP2017");
    expect(banner.textContent).toContain("Systems Programming");
  });

  it("renders assessment section", () => {
    render(<CourseDetailPage courseId="crs_comp2017" />);
    expect(screen.getByTestId("assessment-section")).toBeInTheDocument();
  });

  it("renders materials section", () => {
    render(<CourseDetailPage courseId="crs_comp2017" />);
    expect(screen.getByTestId("materials-section")).toBeInTheDocument();
  });

  it("renders AI chat placeholder with Coming Soon", () => {
    render(<CourseDetailPage courseId="crs_comp2017" />);
    const aiChat = screen.getByTestId("ai-chat-placeholder");
    expect(aiChat).toBeInTheDocument();
    expect(aiChat.textContent).toContain("aiChat.comingSoon");
  });
});
