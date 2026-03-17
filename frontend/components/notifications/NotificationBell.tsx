"use client";

import { Bell } from "lucide-react";
import { useNotificationStore } from "@/lib/stores/notifications";
import { useUnreadCount } from "@/lib/hooks/useNotifications";

/**
 * Bell icon with unread badge. Toggles the notification dropdown on click.
 * Renders useUnreadCount hook to keep the Zustand store synced with API.
 */
export default function NotificationBell() {
  const { unreadCount, toggleDropdown } = useNotificationStore();

  // Keep unread count synced with API (polls every 30s)
  useUnreadCount();

  return (
    <button
      onClick={toggleDropdown}
      className="relative flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: "rgba(60,50,40,.65)",
        transition: "all var(--ease-fast)",
      }}
      aria-label="Notifications"
      data-testid="notification-bell"
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span
          className="absolute flex items-center justify-center"
          style={{
            top: 2,
            right: 2,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--color-orange)",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1,
          }}
          data-testid="notification-badge"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
