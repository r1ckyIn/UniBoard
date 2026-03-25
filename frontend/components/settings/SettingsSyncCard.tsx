"use client";

import { useTranslations } from "next-intl";
import { Activity, LayoutDashboard, MessageCircle, FileText } from "lucide-react";
import RoughCard from "@/components/design-system/RoughCard";

// Hardcoded sync items matching prototype
const SYNC_ITEMS = [
  {
    key: "canvas",
    nameKey: "rightPanel.canvasSync" as const,
    icon: LayoutDashboard,
    iconBg: "rgba(217,60,50,.08)",
    iconColor: "#d93c32",
    time: "12 min ago",
    detail: "5 courses",
  },
  {
    key: "ed",
    nameKey: "rightPanel.edSync" as const,
    icon: MessageCircle,
    iconBg: "rgba(106,155,204,.11)",
    iconColor: "#6a9bcc",
    time: "12 min ago",
    detail: "4 courses",
  },
  {
    key: "outlines",
    nameKey: "rightPanel.outlineSync" as const,
    icon: FileText,
    iconBg: "rgba(176,137,104,.11)",
    iconColor: "#b08968",
    time: "3 days ago",
    detail: "5 parsed",
  },
] as const;

/**
 * Right panel sync status card — shows status for Canvas, Ed, and Unit Outlines.
 */
export default function SettingsSyncCard() {
  const t = useTranslations("settings");

  return (
    <RoughCard>
      {/* Title */}
      <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[14px] text-[#2d2d2a]">
        <Activity size={16} className="text-[#d97757]" />
        {t("rightPanel.syncStatus")}
      </div>

      {/* Sync items */}
      {SYNC_ITEMS.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={`flex items-center gap-[10px] py-[10px] ${
              idx < SYNC_ITEMS.length - 1 ? "border-b border-[#eae7e0]" : ""
            }`}
          >
            {/* Platform icon */}
            <div
              className="w-[28px] h-[28px] rounded-[7px] grid place-items-center shrink-0"
              style={{ background: item.iconBg, color: item.iconColor }}
            >
              <Icon size={14} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-semibold text-[#2d2d2a]">
                {t(item.nameKey)}
              </div>
              <div className="text-[0.66rem] text-[#9b9b94]">
                {item.time} &middot; {item.detail}
              </div>
            </div>

            {/* OK badge */}
            <span className="text-[0.6rem] font-semibold py-[2px] px-[7px] rounded-[4px] bg-[rgba(120,140,93,0.11)] text-[#788c5d] shrink-0">
              OK
            </span>
          </div>
        );
      })}
    </RoughCard>
  );
}
