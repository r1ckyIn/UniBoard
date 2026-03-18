import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import RightPanel from "./RightPanel";

interface AppShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
}

/**
 * Three-column flex layout with top header:
 * - Top: Header (fixed, 56px height) with search, notifications, avatar
 * - Left: Sidebar (fixed, 68px collapsed)
 * - Center: main content area (margins for sidebar, header, and right panel)
 * - Right: RightPanel (fixed, 300px)
 */
export default function AppShell({ children, rightPanel }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <Header />
      <main
        style={{
          marginLeft: "var(--sidebar-w)",
          marginRight: "var(--right-panel-w)",
          marginTop: 56,
          flex: 1,
          padding: "24px 40px",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {children}
      </main>
      <RightPanel>{rightPanel}</RightPanel>
    </div>
  );
}
