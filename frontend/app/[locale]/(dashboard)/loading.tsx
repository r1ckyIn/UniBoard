import SkeletonCard from "@/components/dashboard/SkeletonCard";

// Route-group loading fallback. Next.js 15 automatically wraps the async
// RSC tree in <Suspense fallback={<Loading />}>, so this component
// streams to the client IMMEDIATELY on navigation — before the server
// finishes any awaited prefetch inside createPrefetchedPage.
//
// Phase 38 shifted data fetching from client-hydrate (SkeletonCard → real
// data) to server-RSC (full data in HydrationBoundary). Without this
// loading.tsx, route transitions block visibly on server-side API latency
// (Railway TTFB + parallel prefetch fan-out) — users perceive "click did
// nothing" for several seconds. This file restores the instant-feedback
// contract that the client-side skeletons previously provided, without
// reverting the prefetch architecture.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-[24px] p-[32px] max-w-[1400px] mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="stat" />
        <SkeletonCard variant="stat" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[16px]">
        <SkeletonCard variant="generic" className="lg:col-span-2 min-h-[320px]" />
        <SkeletonCard variant="donut" className="min-h-[320px]" />
      </div>
      <SkeletonCard variant="timeline" className="min-h-[240px]" />
    </div>
  );
}
