"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Activity,
  CheckCircle,
  MessageCircle,
  AlertCircle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import RoughCard from "@/components/design-system/RoughCard";
import ExternalLinkDialog from "@/components/dashboard/ExternalLinkDialog";
import type { ActivityItem } from "@/lib/notifications/map-to-activity";

interface RecentActivityProps {
  activities: ActivityItem[];
}

// Icon and color mapping per activity type
const ICON_CONFIG: Record<
  ActivityItem["type"],
  {
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    textClass: string;
  }
> = {
  grade: {
    icon: CheckCircle,
    bgClass: "bg-green-soft",
    textClass: "text-green",
  },
  discussion: {
    icon: MessageCircle,
    bgClass: "bg-blue-soft",
    textClass: "text-blue",
  },
  deadline: {
    icon: AlertCircle,
    bgClass: "bg-orange-soft",
    textClass: "text-orange",
  },
  endorsed: {
    icon: Star,
    bgClass: "bg-green-soft",
    textClass: "text-green",
  },
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [dialogUrl, setDialogUrl] = useState<string | null>(null);

  const handleItemClick = useCallback(
    (item: ActivityItem) => {
      if (item.internalPath) {
        router.push(item.internalPath);
      } else if (item.externalUrl) {
        setDialogUrl(item.externalUrl);
      }
    },
    [router]
  );

  const handleDialogConfirm = useCallback(() => {
    setDialogUrl(null);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setDialogUrl(null);
  }, []);

  return (
    <>
      <RoughCard padding="p-5" disableHover>
        {/* Title */}
        <div className="flex items-center gap-2 text-[0.95rem] font-semibold mb-4">
          <Activity className="w-4 h-4 text-orange" />
          {t("activity.title")}
        </div>

        {/* Activity list */}
        <div className="flex flex-col gap-4">
          {activities.map((item) => {
            const config = ICON_CONFIG[item.type];
            const IconComponent = config.icon;

            // Split text around strongText for rendering
            const strongIndex = item.text.indexOf(item.strongText);
            const beforeStrong =
              strongIndex >= 0
                ? item.text.slice(0, strongIndex)
                : "";
            const afterStrong =
              strongIndex >= 0
                ? item.text.slice(strongIndex + item.strongText.length)
                : item.text;

            return (
              <div
                key={item.id}
                role={item.internalPath || item.externalUrl ? "button" : undefined}
                tabIndex={item.internalPath || item.externalUrl ? 0 : undefined}
                onClick={() => handleItemClick(item)}
                onKeyDown={
                  item.internalPath || item.externalUrl
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemClick(item);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "flex gap-[10px] items-start rounded-[8px] px-2 py-2 -mx-2",
                  "transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]",
                  "hover:bg-[rgba(217,119,87,.04)] hover:shadow-[0_2px_8px_rgba(217,119,87,.10)] hover:-translate-y-[1px]",
                  (item.internalPath || item.externalUrl) && "cursor-pointer"
                )}
              >
                {/* Icon box */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-[8px] grid place-items-center flex-shrink-0",
                    config.bgClass,
                    config.textClass
                  )}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Text content */}
                <div>
                  <div className="text-[0.76rem] text-text-2 leading-[1.4]">
                    {strongIndex >= 0 ? (
                      <>
                        {beforeStrong}
                        <strong className="text-text-1 font-semibold">
                          {item.strongText}
                        </strong>
                        {afterStrong}
                      </>
                    ) : (
                      item.text
                    )}
                  </div>
                  <div className="text-[0.66rem] text-text-3">{item.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </RoughCard>

      {/* External link confirmation dialog */}
      <ExternalLinkDialog
        open={!!dialogUrl}
        url={dialogUrl ?? ""}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </>
  );
}
