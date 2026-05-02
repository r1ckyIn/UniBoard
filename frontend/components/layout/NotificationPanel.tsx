"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ────────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

interface NotificationPanelProps {
  notifications: NotificationItem[];
  onViewAll: () => void;
  onItemClick?: (notification: { id: string; action_url?: string }) => void;
}

// ── Icon mapping by notification type ────────────────────────────────────────
const ICON_MAP: Record<
  string,
  { icon: typeof Clock; bg: string; color: string }
> = {
  deadline_reminder: {
    icon: Clock,
    bg: "bg-orange-soft",
    color: "text-orange",
  },
  grade_published: {
    icon: CheckCircle,
    bg: "bg-green-soft",
    color: "text-green",
  },
  token_expired: {
    icon: AlertTriangle,
    bg: "bg-[rgba(176,137,104,.11)]",
    color: "text-amber",
  },
  sync_complete: {
    icon: RefreshCw,
    bg: "bg-blue-soft",
    color: "text-blue",
  },
};

const DEFAULT_ICON = {
  icon: Bell,
  bg: "bg-card-bg-hover",
  color: "text-text-2",
};

// ── Component ────────────────────────────────────────────────────────────────
export default function NotificationPanel({
  notifications,
  onViewAll,
  onItemClick,
}: NotificationPanelProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const dateFnsLocale = locale === "zh" ? zhCN : enUS;

  return (
    <div
      className={cn(
        "absolute top-[calc(100%+12px)] right-0",
        "bg-white rounded-[12px] border-[1.5px] border-card-border",
        "shadow-dropdown z-[200] overflow-hidden",
        "animate-drop-in w-[320px]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow notch */}
      <div className="absolute -top-[7px] right-[14px] w-3 h-3 bg-white border-t-[1.5px] border-l-[1.5px] border-card-border rotate-45 z-[1]" />

      {/* Title */}
      <div className="font-serif text-[0.88rem] font-semibold px-4 pt-4 pb-3 text-text-1">
        {t("notifications.title")}
      </div>

      {/* Scrollable notification list */}
      <div className="max-h-[260px] overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
        {notifications.map((notification) => {
          const mapping = ICON_MAP[notification.type] ?? DEFAULT_ICON;
          const Icon = mapping.icon;

          return (
            <div
              key={notification.id}
              className={cn(
                "flex gap-3 items-start px-4 py-3 cursor-pointer",
                notification.is_read
                  ? "bg-transparent hover:bg-card-bg-hover"
                  : "bg-[rgba(217,119,87,.05)] hover:bg-[rgba(217,119,87,.09)]"
              )}
              onClick={() =>
                onItemClick?.({
                  id: notification.id,
                  action_url: notification.action_url,
                })
              }
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-[8px] grid place-items-center flex-shrink-0",
                  mapping.bg,
                  mapping.color
                )}
              >
                <Icon className="w-[14px] h-[14px]" />
              </div>
              <div>
                <div className="text-[0.78rem] text-text-2 leading-[1.4]">
                  <strong className="text-text-1 font-semibold">
                    {notification.title}
                  </strong>{" "}
                  {notification.body}
                </div>
                <div className="text-[0.66rem] text-text-3 mt-px">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: dateFnsLocale,
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 text-center text-[0.76rem] font-semibold text-orange border-t border-divider cursor-pointer transition-claude-fast hover:bg-card-bg-hover"
        onClick={onViewAll}
      >
        {t("notifications.footer")}
      </div>
    </div>
  );
}
