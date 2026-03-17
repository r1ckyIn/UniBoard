"use client";

import { BookOpen, AlertTriangle, Target, Lightbulb, RefreshCw } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";
import { useCourseReview } from "@/lib/hooks/useAI";
import { useQueryClient } from "@tanstack/react-query";

interface UnitReviewProps {
  courseId: string;
}

/**
 * AI-generated structured unit review: key concepts, common mistakes,
 * exam scope, and study tips.
 */
export default function UnitReview({ courseId }: UnitReviewProps) {
  const { data: review, isLoading, isError } = useCourseReview(courseId);
  const queryClient = useQueryClient();

  const handleRegenerate = () => {
    queryClient.invalidateQueries({ queryKey: ["courseReview", courseId] });
  };

  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
          Unit Review
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  if (isError || !review) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3 className="text-lg mb-4" style={{ fontFamily: "var(--font-serif)" }}>
          Unit Review
        </h3>
        <p style={{ color: "var(--color-text-3)" }}>
          Unable to generate review. Please try again later.
        </p>
      </RoughCard>
    );
  }

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg" style={{ fontFamily: "var(--font-serif)" }}>
          Unit Review
        </h3>
        <button
          onClick={handleRegenerate}
          className="p-1.5 rounded hover:opacity-80 transition-opacity"
          style={{ color: "var(--color-text-2)" }}
          aria-label="Regenerate review"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Key Concepts */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={16} style={{ color: "var(--color-blue)" }} />
            <h4 className="text-sm font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Key Concepts
            </h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {review.key_concepts.map((concept, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--color-text-2)" }}>
                {concept}
              </li>
            ))}
          </ul>
        </section>

        {/* Common Mistakes */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: "var(--color-orange)" }} />
            <h4 className="text-sm font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Common Mistakes
            </h4>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {review.common_mistakes.map((mistake, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--color-orange)" }}>
                {mistake}
              </li>
            ))}
          </ul>
        </section>

        {/* Exam Scope */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} style={{ color: "var(--color-green)" }} />
            <h4 className="text-sm font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Exam Scope
            </h4>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
            {review.exam_scope}
          </p>
        </section>

        {/* Study Tips */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} style={{ color: "var(--color-amber)" }} />
            <h4 className="text-sm font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
              Study Tips
            </h4>
          </div>
          <ol className="list-decimal list-inside space-y-1">
            {review.study_tips.map((tip, i) => (
              <li key={i} className="text-sm" style={{ color: "var(--color-text-2)" }}>
                {tip}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Timestamp */}
      <p className="text-[10px] mt-4" style={{ color: "var(--color-text-3)" }}>
        Generated at {new Date(review.generated_at).toLocaleString()}
      </p>
    </RoughCard>
  );
}
