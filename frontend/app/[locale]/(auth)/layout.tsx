import type { ReactNode } from "react";
import QueryProvider from "@/components/layout/QueryProvider";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth layout: standalone, no sidebar. Full-width centered.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <QueryProvider>
      <div className="min-h-screen flex" style={{ background: "var(--color-cream)" }}>
        {children}
      </div>
    </QueryProvider>
  );
}
