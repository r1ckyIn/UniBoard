import AppShell from "@/components/layout/AppShell";
import { DashboardGuard } from "@/components/layout/DashboardGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <AppShell>{children}</AppShell>
    </DashboardGuard>
  );
}
