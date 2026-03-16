import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import RightPanel from "./RightPanel";

interface AppShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

/**
 * Three-column flex layout:
 * - Left: Sidebar (fixed, 68px collapsed)
 * - Center: main content area (margins for sidebar and right panel)
 * - Right: RightPanel (fixed, 300px)
 */
export default function AppShell({ children, rightPanel }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        style={{
          marginLeft: "var(--sidebar-w)",
          marginRight: "var(--right-panel-w)",
          flex: 1,
          padding: "24px 40px",
          minHeight: "100vh",
        }}
      >
        {children}
      </main>
      <RightPanel>{rightPanel}</RightPanel>
    </div>
  );
}
