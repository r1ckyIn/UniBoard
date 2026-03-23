import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import RightPanel from "@/components/layout/RightPanel";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-[var(--spacing-sidebar-w)] flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 py-7 px-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - var(--spacing-header-h))" }}>
          <div className="flex gap-7 items-start">
            <div className="flex-1 flex flex-col gap-7">{children}</div>
            <RightPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
