"use client";

import RoughCard from "@/components/design-system/RoughCard";
import { formatRelative } from "@/lib/utils/dates";
import type { HighValuePostResponse } from "@/lib/api/types";

interface HighValuePostsProps {
  posts: HighValuePostResponse[];
  isLoading: boolean;
}

/**
 * Card list of endorsed and staff-answered Ed Discussion posts.
 */
export default function HighValuePosts({
  posts,
  isLoading,
}: HighValuePostsProps) {
  if (isLoading) {
    return (
      <RoughCard className="p-5 bg-[var(--color-card-bg)]">
        <h3
          className="text-lg mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          High-Value Posts
        </h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded bg-[var(--color-divider)] animate-pulse" />
          ))}
        </div>
      </RoughCard>
    );
  }

  return (
    <RoughCard className="p-5 bg-[var(--color-card-bg)]">
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        High-Value Posts
      </h3>

      {posts.length === 0 ? (
        <p style={{ color: "var(--color-text-3)" }}>
          No high-value posts found for this course.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-3 rounded border"
              style={{
                borderColor: "var(--color-divider)",
                backgroundColor: "var(--color-cream)",
              }}
            >
              {/* Title */}
              <h4
                className="text-sm font-semibold mb-1"
                style={{ fontFamily: "var(--font-serif)", color: "var(--color-text-1)" }}
              >
                {post.title}
              </h4>

              {/* Badges row */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {/* Category badge */}
                <span
                  className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
                  style={{
                    backgroundColor: "var(--color-blue-soft)",
                    color: "var(--color-blue)",
                  }}
                >
                  {post.category}
                </span>

                {post.is_endorsed && (
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
                    style={{
                      backgroundColor: "var(--color-green-soft)",
                      color: "var(--color-green)",
                    }}
                  >
                    Endorsed
                  </span>
                )}

                {post.is_staff_post && (
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-medium"
                    style={{
                      backgroundColor: "var(--color-blue-soft)",
                      color: "var(--color-blue)",
                    }}
                  >
                    Staff Answer
                  </span>
                )}
              </div>

              {/* Summary */}
              <p
                className="text-xs mb-2"
                style={{ color: "var(--color-text-2)", lineHeight: 1.5 }}
              >
                {post.content_summary.length > 200
                  ? `${post.content_summary.slice(0, 200)}...`
                  : post.content_summary}
              </p>

              {/* Timestamp */}
              <p
                className="text-[10px]"
                style={{ color: "var(--color-text-3)" }}
              >
                {formatRelative(post.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </RoughCard>
  );
}
