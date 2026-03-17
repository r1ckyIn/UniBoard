"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useNotificationStore } from "@/lib/stores/notifications";
import { useNotifications, useMarkRead } from "@/lib/hooks/useNotifications";
import { formatRelative } from "@/lib/utils/dates";

/** Map severity to lucide icon and color */
const severityConfig = {
  critical: { Icon: AlertTriangle, color: "var(--color-orange)" },
  warning: { Icon: AlertCircle, color: "var(--color-amber)" },
  info: { Icon: Info, color: "var(--color-blue)" },
} as const;

/**
 * Dropdown notification list, shown below the bell icon.
 * Click-outside closes the dropdown.
 */
export default function NotificationDropdown() {
  const { isDropdownOpen, closeDropdown } = useNotificationStore();
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isDropdownOpen, closeDropdown]);

  if (!isDropdownOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50"
      style={{
        bottom: "100%",
        left: 0,
        marginBottom: 8,
        width: 360,
        maxHeight: 400,
        overflowY: "auto",
        background: "var(--color-card-bg)",
        borderRadius: "var(--radius-card)",
        boxShadow: "0 8px 32px rgba(0,0,0,.12)",
        border: "1px solid rgba(60,50,40,.08)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(60,50,40,.08)" }}
      >
        <span className="text-sm font-semibold">Notifications</span>
      </div>

      {/* Items */}
      <div className="py-1">
        {!notifications || notifications.length === 0 ? (
          <div
            className="px-4 py-6 text-center text-sm"
            style={{ color: "var(--color-text-3)" }}
          >
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => {
            const config =
              severityConfig[n.severity as keyof typeof severityConfig] ??
              severityConfig.info;
            const SeverityIcon = config.Icon;

            return (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.is_read) {
                    markRead.mutate(n.id);
                  }
                  closeDropdown();
                }}
                className="flex items-start gap-3 w-full text-left px-4 py-3"
                style={{
                  borderLeft: n.is_read
                    ? "3px solid transparent"
                    : `3px solid var(--color-orange)`,
                  background: n.is_read ? "transparent" : "rgba(217,119,87,.04)",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: "1px solid rgba(60,50,40,.04)",
                  transition: "background var(--ease-fast)",
                }}
              >
                <SeverityIcon
                  size={16}
                  className="shrink-0 mt-0.5"
                  style={{ color: config.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div
                    className="text-xs mt-0.5 line-clamp-2"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    {n.body.length > 80 ? `${n.body.slice(0, 80)}...` : n.body}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    {formatRelative(n.created_at)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
