import type { ReactNode } from "react";
import QueryProvider from "@/components/layout/QueryProvider";

interface OnboardingLayoutProps {
  children: ReactNode;
}

/**
 * Onboarding layout: standalone, no sidebar. Centered card, max-width 640px.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <QueryProvider>
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--color-cream)" }}
      >
        <div className="w-full" style={{ maxWidth: 640 }}>
          {children}
        </div>
      </div>
    </QueryProvider>
  );
}
