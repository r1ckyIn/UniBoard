"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Wrap any component that uses Rough.js or browser APIs
 * to skip SSR entirely, preventing hydration mismatches.
 *
 * Usage:
 *   const RoughCard = withClientOnly(
 *     () => import("@/components/design-system/RoughCard")
 *   );
 */
export function withClientOnly<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <>{fallback ?? null}</>,
  });
}
