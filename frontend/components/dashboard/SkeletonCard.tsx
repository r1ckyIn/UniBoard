"use client";

import { cn } from "@/lib/utils/cn";

type SkeletonVariant = "stat" | "table" | "timeline" | "donut" | "profile" | "calendar" | "activity";

interface SkeletonCardProps {
  variant: SkeletonVariant;
  className?: string;
}

/** Reusable shimmer bar with warm-toned gradient matching paper-texture aesthetic */
function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[6px] animate-skeleton-shimmer",
        "bg-[length:200%_100%]",
        "bg-[#ede9e1]",
        "bg-gradient-to-r from-[#f0ede6] via-[#e8e3d9] to-[#f0ede6]",
        className
      )}
    />
  );
}

function StatSkeleton() {
  return (
    <div className="py-[20px] px-[24px]">
      <ShimmerBar className="h-3 w-20" />
      <ShimmerBar className="h-8 w-16 mt-2" />
      <ShimmerBar className="h-3 w-32 mt-2" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="py-[20px] px-[24px]">
      <ShimmerBar className="h-4 w-40 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 mb-2.5">
          <ShimmerBar className="h-3 w-16" />
          <ShimmerBar className="h-3 w-24" />
          <ShimmerBar className="h-2.5 w-20" />
          <ShimmerBar className="h-3 w-12" />
          <ShimmerBar className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="py-[20px] px-[24px]">
      <ShimmerBar className="h-4 w-36 mb-4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 mb-3">
          <ShimmerBar className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" />
          <div className="flex flex-col gap-1.5">
            <ShimmerBar className="h-3 w-28" />
            <ShimmerBar className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutSkeleton() {
  return (
    <div className="py-[20px] px-[24px]">
      <ShimmerBar className="h-4 w-36 mb-4" />
      <ShimmerBar className="w-[160px] h-[160px] rounded-full mx-auto" />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="py-[24px] px-[20px] text-center">
      <ShimmerBar className="w-[52px] h-[52px] rounded-[14px] mx-auto" />
      <ShimmerBar className="h-4 w-24 mx-auto mt-3" />
      <ShimmerBar className="h-3 w-32 mx-auto mt-1" />
      <div className="grid grid-cols-2 gap-2 mt-4">
        <ShimmerBar className="h-12" />
        <ShimmerBar className="h-12" />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="py-[16px] px-[20px]">
      <ShimmerBar className="h-4 w-28 mx-auto mb-3" />
      <div className="grid grid-cols-7 gap-px">
        {/* Day-of-week headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <ShimmerBar key={`h-${i}`} className="h-3 mb-1" />
        ))}
        {/* Calendar day cells */}
        {Array.from({ length: 35 }).map((_, i) => (
          <ShimmerBar key={`d-${i}`} className="h-6" />
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="p-[20px]">
      <ShimmerBar className="h-4 w-28 mb-4" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-[10px] mb-3">
          <ShimmerBar className="w-8 h-8 rounded-[8px] shrink-0" />
          <div className="flex flex-col gap-1">
            <ShimmerBar className="h-3 w-36" />
            <ShimmerBar className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

const VARIANT_MAP: Record<SkeletonVariant, React.FC> = {
  stat: StatSkeleton,
  table: TableSkeleton,
  timeline: TimelineSkeleton,
  donut: DonutSkeleton,
  profile: ProfileSkeleton,
  calendar: CalendarSkeleton,
  activity: ActivitySkeleton,
};

export default function SkeletonCard({ variant, className }: SkeletonCardProps) {
  const VariantComponent = VARIANT_MAP[variant];

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={cn(
        "bg-card-bg rounded-card border border-card-border",
        "shadow-[0_1px_3px_rgba(20,20,19,0.04),0_4px_14px_rgba(20,20,19,0.025)]",
        className
      )}
    >
      <VariantComponent />
    </div>
  );
}
