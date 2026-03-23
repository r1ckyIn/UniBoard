import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

// Mock ExternalLinkDialog
vi.mock("@/components/dashboard/ExternalLinkDialog", () => ({
  default: ({
    open,
    url,
  }: {
    open: boolean;
    url: string;
    onCancel: () => void;
    onConfirm: () => void;
  }) =>
    open ? <div data-testid="external-link-dialog" data-url={url} /> : null,
}));

// Import fixtures for mock data
import { discussionsByCourse } from "@/lib/fixtures/discussions";

// Filter high-value discussions (endorsed or staff posts) like the hook does
const highValuePosts = discussionsByCourse.crs_comp2017.filter(
  (d) => d.is_endorsed || d.is_staff_post
);

const emptyPosts: typeof highValuePosts = [];

// Mock useCourseDiscussions hook
const mockUseCourseDiscussions = vi.fn();

vi.mock("@/hooks/use-discussions", () => ({
  useCourseDiscussions: (...args: unknown[]) =>
    mockUseCourseDiscussions(...args),
}));

import EdPostsPanel from "@/components/course-detail/EdPostsPanel";

describe("EdPostsPanel", () => {
  const defaultProps = {
    courseId: "crs_comp2017",
    edCourseId: "67890",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseDiscussions.mockReturnValue({
      data: { data: highValuePosts, meta: { timestamp: "" } },
      isLoading: false,
      error: null,
    });
  });

  it("renders post titles from high-value discussions", () => {
    render(<EdPostsPanel {...defaultProps} />);
    // All high-value posts should have their titles rendered
    for (const post of highValuePosts) {
      expect(screen.getByText(post.title)).toBeInTheDocument();
    }
  });

  it("shows endorsed badge for endorsed posts", () => {
    render(<EdPostsPanel {...defaultProps} />);
    // Count endorsed posts in fixture
    const endorsedCount = highValuePosts.filter((p) => p.is_endorsed).length;
    const endorsedBadges = screen.getAllByText("edPosts.endorsed");
    expect(endorsedBadges).toHaveLength(endorsedCount);
  });

  it("shows staff badge for staff posts", () => {
    render(<EdPostsPanel {...defaultProps} />);
    // Count staff posts in fixture
    const staffCount = highValuePosts.filter((p) => p.is_staff_post).length;
    const staffBadges = screen.getAllByText("edPosts.staffPost");
    expect(staffBadges).toHaveLength(staffCount);
  });

  it("renders empty state when no posts", () => {
    mockUseCourseDiscussions.mockReturnValue({
      data: { data: emptyPosts, meta: { timestamp: "" } },
      isLoading: false,
      error: null,
    });
    render(<EdPostsPanel {...defaultProps} />);
    expect(screen.getByText("edPosts.empty")).toBeInTheDocument();
  });
});
