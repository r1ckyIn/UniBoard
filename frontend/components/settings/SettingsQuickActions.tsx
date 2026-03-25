"use client";

import { useTranslations } from "next-intl";
import { Zap, RefreshCw, Download, HelpCircle, MessageCircle } from "lucide-react";
import { useSyncTrigger } from "@/hooks/use-sync";
import { useExportData } from "@/hooks/use-user";
import RoughCard from "@/components/design-system/RoughCard";

// Action definitions matching prototype
const ACTIONS = [
  {
    key: "sync",
    titleKey: "rightPanel.forcSync" as const,
    icon: RefreshCw,
    iconBg: "rgba(217,119,87,.11)",
    iconColor: "#d97757",
  },
  {
    key: "export",
    titleKey: "rightPanel.exportData" as const,
    icon: Download,
    iconBg: "rgba(106,155,204,.11)",
    iconColor: "#6a9bcc",
  },
  {
    key: "help",
    titleKey: "rightPanel.helpSupport" as const,
    icon: HelpCircle,
    iconBg: "rgba(120,140,93,.11)",
    iconColor: "#788c5d",
  },
  {
    key: "feedback",
    titleKey: "rightPanel.sendFeedback" as const,
    icon: MessageCircle,
    iconBg: "rgba(155,123,184,.11)",
    iconColor: "#9b7bb8",
  },
] as const;

/**
 * Right panel quick actions card — Force Sync, Export, Help, Feedback buttons.
 */
export default function SettingsQuickActions() {
  const t = useTranslations("settings");
  const syncTrigger = useSyncTrigger();
  const { refetch: triggerExport } = useExportData();

  const handleAction = (key: string) => {
    switch (key) {
      case "sync":
        syncTrigger.mutate({ scope: "all" });
        break;
      case "export":
        triggerExport();
        break;
      case "help":
        window.open("#", "_blank");
        break;
      case "feedback":
        window.open("https://github.com/r1ckyIn/UniBoard/issues", "_blank");
        break;
    }
  };

  return (
    <RoughCard>
      {/* Title */}
      <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[14px] text-[#2d2d2a]">
        <Zap size={16} className="text-[#d97757]" />
        {t("rightPanel.quickActions")}
      </div>

      {/* Action buttons */}
      {ACTIONS.map((action, idx) => {
        const Icon = action.icon;
        return (
          <button
            key={action.key}
            type="button"
            onClick={() => handleAction(action.key)}
            className={`flex items-center gap-[10px] py-[10px] px-[14px] rounded-[8px] w-full text-left transition-colors duration-150 hover:bg-[#efede6] ${
              idx < ACTIONS.length - 1 ? "border-b border-[#eae7e0]" : ""
            }`}
          >
            {/* Icon wrapper */}
            <div
              className="w-[28px] h-[28px] rounded-[7px] grid place-items-center shrink-0"
              style={{ background: action.iconBg, color: action.iconColor }}
            >
              <Icon size={14} />
            </div>

            {/* Label */}
            <span className="text-[0.82rem] font-medium text-[#2d2d2a]">
              {t(action.titleKey)}
            </span>
          </button>
        );
      })}
    </RoughCard>
  );
}
