import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CourseQA from "@/components/ai/CourseQA";

// Mock useAskQuestion hook
const mockMutate = vi.fn();
vi.mock("@/lib/hooks/useAI", () => ({
  useAskQuestion: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("CourseQA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input with placeholder text", () => {
    render(<CourseQA courseId="test-id" />, { wrapper });
    expect(
      screen.getByPlaceholderText("Ask about your course materials...")
    ).toBeDefined();
  });

  it("renders submit button", () => {
    render(<CourseQA courseId="test-id" />, { wrapper });
    expect(screen.getByRole("button", { name: "Send question" })).toBeDefined();
  });

  it("shows user message in chat after submission", async () => {
    // Make mutate call onSuccess immediately with mock data
    mockMutate.mockImplementation((_req: unknown, opts: { onSuccess: (data: unknown) => void }) => {
      opts.onSuccess({
        answer: "The answer is 42.",
        citations: ["Canvas: Lecture 3"],
        method: "direct_context",
        tokens_used: 100,
      });
    });

    render(<CourseQA courseId="test-id" />, { wrapper });
    const input = screen.getByPlaceholderText("Ask about your course materials...");

    fireEvent.change(input, { target: { value: "What is the meaning of life?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    await waitFor(() => {
      expect(screen.getByText("What is the meaning of life?")).toBeDefined();
      expect(screen.getByText("The answer is 42.")).toBeDefined();
    });
  });

  it("renders citation pills when present", async () => {
    mockMutate.mockImplementation((_req: unknown, opts: { onSuccess: (data: unknown) => void }) => {
      opts.onSuccess({
        answer: "See lecture notes.",
        citations: ["Canvas: Week 3 Lecture Notes", "Ed: Tutorial Discussion"],
        method: "rag",
        tokens_used: 200,
      });
    });

    render(<CourseQA courseId="test-id" />, { wrapper });
    const input = screen.getByPlaceholderText("Ask about your course materials...");

    fireEvent.change(input, { target: { value: "Where can I find notes?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    await waitFor(() => {
      const pills = screen.getAllByTestId("citation-pill");
      expect(pills).toHaveLength(2);
      expect(pills[0].textContent).toBe("Canvas: Week 3 Lecture Notes");
      expect(pills[1].textContent).toBe("Ed: Tutorial Discussion");
    });
  });
});
