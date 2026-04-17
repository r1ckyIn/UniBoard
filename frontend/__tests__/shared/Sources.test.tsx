/**
 * Tests for Sources citation panel (AIFEAT-02 / Phase 34 Plan 34-05).
 *
 * Verifies the component:
 * 1. Renders [N] marker + title + anchor + score% + excerpt per source
 * 2. Returns null when sources array is empty (no empty <details> shell)
 * 3. Opens collapsible details on summary click
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import Sources from "@/components/shared/Sources";
import type { CitationSource } from "@/lib/api/ai-stream";

const baseSource: CitationSource = {
  index: 1,
  module_id: "mod_abc",
  title: "Lecture 1",
  source_type: "module_item",
  anchor: "Slide 8",
  score: 0.92,
  excerpt: "Hello world example...",
};

describe("Sources component", () => {
  it("renders [N] inline markers with title, anchor and score (AIFEAT-02)", () => {
    const sources: CitationSource[] = [
      baseSource,
      { ...baseSource, index: 2, title: "Module 2", anchor: null, score: 0.78 },
    ];
    render(<Sources sources={sources} />);

    // Click to open details so ordered list renders
    const summary = screen.getByText(/label/i);
    fireEvent.click(summary);

    // Both titles appear (titles live as text nodes inside <li>)
    expect(screen.getByText(/Lecture 1/)).toBeInTheDocument();
    expect(screen.getByText(/Module 2/)).toBeInTheDocument();

    // [1] and [2] inline markers present
    expect(screen.getByText("[1]")).toBeInTheDocument();
    expect(screen.getByText("[2]")).toBeInTheDocument();

    // Score rendered as integer percentage
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("78%")).toBeInTheDocument();
  });

  it("returns null when sources array is empty (no empty shell)", () => {
    const { container } = render(<Sources sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders per-source excerpt as italic preview", () => {
    render(<Sources sources={[baseSource]} />);
    const summary = screen.getByText(/label/i);
    fireEvent.click(summary);

    const excerpt = screen.getByText("Hello world example...");
    expect(excerpt).toBeInTheDocument();
    // Excerpt has italic class per component design
    expect(excerpt.className).toContain("italic");
  });
});
