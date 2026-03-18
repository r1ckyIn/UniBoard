"use client";

import RoughCard from "@/components/design-system/RoughCard";
import { formatRelative } from "@/lib/utils/dates";
import { useAIHighValuePosts } from "@/lib/hooks/useAI";
import type { AIHighValuePostResponse } from "@/lib/api/types";

interface AIHighValuePostsProps {
  courseId: string;
  fallbackPosts?: { id: string; title: string; category: string; content_summary: string; is_endorsed: boolean; is_staff_post: boolean; created_at: string }[];
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  exam_info: { bg: "var(--color-orange-soft)", text: "var(--color-orange)" },
  assignment_clarification: { bg: "var(--color-blue-soft)", text: "var(--color-blue)" },
  rubric: { bg: "#f3e8ff", text: "#7c3aed" },
  deadline_change: { bg: "var(--color-orange-soft)", text: "var(--color-orange)" },
  common_mistake: { bg: "var(--color-amber-soft, #fef3c7)", text: "var(--color-amber)" },
  endorsed_answer: { bg: "var(--color-green-soft)", text: "var(--color-green)" },
  irrelevant: { bg: "var(--color-divider)", text: "var(--color-text-3)" },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "var(--color-orange)",
  important: "var(--color-amber)",
  informational: "var(--color-text-3)",
};

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full flex-1"
        style={{ backgroundColor: "var(--color-divider)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: score > 0.7 ? "var(--color-orange)" : score > 0.4 ? "var(--color-amber)" : "var(--color-text-3)",
          }}
        />
      </div>
      <span className="text-[10px] tabular-nums" style={{ color: "var(--color-text-3)" }}>
        {pct}%
      </span>
    </div>
  );
}

function PostCard({ post }: { post: AIHighValuePostResponse }) {
  const catStyle = CATEGORY_COLORS[post.ai_category] ?? CATEGORY_COLORS.irrelevant;
  const urgencyColor = URGENCY_COLORS[post.urgency] ?? URGENCY_COLORS.informational;

  return (
    <div
      className="p-3 rounded border"
      style={{ borderColor: "var(--color-divider)", backgroundColor: "var(--color-cream)" }}
    >
      {/* Title + urgency dot */}
      <div className="flex items-start gap-2 mb-1">
        <span
          className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: urgencyColor }}
          title={post.urgency}
        />
        <h4
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
        >
          {post.title}
        </h4>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2 ml-4">
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
          style={{ backgroundColor: catStyle.bg, color: catStyle.text }}
        >
          {post.ai_category.replace(/_/g, " ")}
        </span>
        {post.is_endorsed && (
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
            style={{ backgroundColor: "var(--color-green-soft)", color: "var(--color-green)" }}
          >
            Endorsed
          </span>
        )}
        {post.is_staff_post && (
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
            style={{ backgroundColor: "var(--color-blue-soft)", color: "var(--color-blue)" }}
          >
            Staff
          </span>
        )}
      </div>

      {/* Relevance bar */}
      <div className="mb-2 ml-4">
        <RelevanceBar score={post.gpa_relevance} />
      </div>

      {/* AI summary */}
      <p className="text-xs mb-2 ml-4" style={{ color: "var(--color-text-2)", lineHeight: 1.5 }}>
        {post.ai_summary}
      </p>

      {/* Key facts */}
      {post.key_facts.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-4 mb-2">
          {post.key_facts.map((fact, i) => (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: "var(--color-divider)", color: "var(--color-text-2)" }}
            >
              {fact}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-[10px] ml-4" style={{ color: "var(--color-text-3)" }}>
        {formatRelative(post.created_at)}
      </p>
    </div>
  );
}

/**
 * AI-scored high-value Ed Discussion posts with GPA relevance
 * and category analysis. Falls back to basic posts on error.
 */
export default function AIHighValuePosts({ courseId, fallbackPosts }: AIHighValuePostsProps) {
  const { data: aiPosts, isLoading, isError } = useAIHighValuePosts(courseId);

  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
          AI-Scored Posts
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  // Fallback to basic posts on error or empty AI results
  if (isError || !aiPosts || aiPosts.length === 0) {
    if (fallbackPosts && fallbackPosts.length > 0) {
      return (
        <RoughCard className="p-5 bg-[var(--color-card-bg)]">
          <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            High-Value Posts
          </h3>
          <div className="space-y-3">
            {fallbackPosts.map((post) => (
              <div
                key={post.id}
                className="p-3 rounded border"
                style={{ borderColor: "var(--color-divider)", backgroundColor: "var(--color-cream)" }}
              >
                <h4 className="text-sm font-semibold mb-1" style={{ fontFamily: "var(--font-serif)" }}>
                  {post.title}
                </h4>
                <p className="text-xs" style={{ color: "var(--color-text-2)" }}>
                  {post.content_summary}
                </p>
              </div>
            ))}
          </div>
        </RoughCard>
      );
    }

    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]" style={{ minHeight: 120 }}>
        <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
          AI-Scored Posts
        </h3>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          {isError
            ? "AI post analysis is being configured. Check back after discussions are synced."
            : "No AI-scored posts available for this course."}
        </p>
      </RoughCard>
    );
  }

  // Sort by GPA relevance descending
  const sorted = [...aiPosts].sort((a, b) => b.gpa_relevance - a.gpa_relevance);

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
        AI-Scored Posts
      </h3>
      <div className="space-y-3">
        {sorted.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </RoughCard>
  );
}
