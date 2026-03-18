"use client";

import { Search } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

/**
 * Top header bar with search placeholder, notification bell, and user avatar.
 * Fixed position above the main content area, always visible regardless of sidebar state.
 */
export default function Header() {
  return (
    <header
      className="fixed top-0 z-[90] flex items-center justify-between"
      style={{
        left: "var(--sidebar-w)",
        right: "var(--right-panel-w)",
        height: 56,
        padding: "0 32px",
        background: "rgba(var(--color-cream-rgb, 250,247,240), 0.6)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      {/* Left: page title placeholder */}
      <div />

      {/* Right: search + notifications + avatar */}
      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="relative" data-testid="header-search">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-3)" }}
          />
          <input
            type="text"
            placeholder="Search courses, deadlines..."
            readOnly
            className="text-sm"
            style={{
              width: 240,
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              borderRadius: 8,
              border: "1px solid var(--color-divider)",
              background: "transparent",
              color: "var(--color-text-2)",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
        </div>

        {/* Notification bell + dropdown */}
        <div className="relative" data-testid="header-notifications">
          <NotificationBell />
          <NotificationDropdown />
        </div>

        {/* User avatar */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--color-orange)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
          }}
          data-testid="header-avatar"
          aria-label="User menu"
        >
          U
        </div>
      </div>
    </header>
  );
}
