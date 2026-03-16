import clsx from "clsx";

interface SkeletonCardProps {
  className?: string;
  /** Number of content lines to show (default 3). */
  lines?: number;
}

/**
 * Animated skeleton loading placeholder with pulse animation.
 * Matches the card-bg color from the design system.
 */
export default function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={clsx(
        "rounded-[14px] p-5 animate-pulse",
        className
      )}
      style={{
        background: "var(--color-card-bg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Title skeleton */}
      <div
        className="h-4 rounded mb-4"
        style={{ background: "var(--color-card-border)", width: "60%" }}
      />
      {/* Content line skeletons */}
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded mb-2"
          style={{
            background: "var(--color-card-border)",
            width: `${80 - i * 15}%`,
          }}
        />
      ))}
    </div>
  );
}
