import type { ReactNode } from "react";
import AppShell from "@/components/layout/AppShell";
import QueryProvider from "@/components/layout/QueryProvider";

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout: wraps children in QueryProvider + AppShell (sidebar + right panel).
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  );
}
