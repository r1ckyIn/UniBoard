"use client";

import { useTranslations } from "next-intl";
import { Key, Target, Bell, Globe, Link2, User, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SectionItem {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  isDanger?: boolean;
}

const SECTION_ITEMS: SectionItem[] = [
  { id: "sec-tokens", icon: Key, labelKey: "nav.tokens" },
  { id: "sec-gpa", icon: Target, labelKey: "nav.gpa" },
  { id: "sec-notifications", icon: Bell, labelKey: "nav.notifications" },
  { id: "sec-language", icon: Globe, labelKey: "nav.language" },
  { id: "sec-courses", icon: Link2, labelKey: "nav.courses" },
  { id: "sec-profile", icon: User, labelKey: "nav.profile" },
  { id: "sec-danger", icon: AlertTriangle, labelKey: "nav.danger", isDanger: true },
];

interface SettingsNavProps {
  activeSection: string;
  onNavClick: (sectionId: string) => void;
}

export default function SettingsNav({ activeSection, onNavClick }: SettingsNavProps) {
  const t = useTranslations("settings");

  return (
    <nav
      className="hidden min-[900px]:flex w-[170px] flex-shrink-0 sticky top-0 self-start flex-col"
      aria-label="Settings navigation"
    >
      <div className="font-serif text-[0.78rem] font-semibold text-[#9b9b94] uppercase tracking-[0.05em] px-[12px] mb-[10px]">
        {t("nav.title")}
      </div>
      <ul className="list-none flex flex-col gap-[2px]">
        {SECTION_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavClick(item.id)}
                // Phase 40 code review WR-04: previously the className had
                // `border-l-2 border-transparent` plus an active-state
                // `border-l-[#d97757]` AND an inline `style.borderLeftColor`.
                // Inline style always overrides Tailwind utilities, so the
                // className portion controlling the left border was dead
                // code that would silently shadow any future className tweak.
                // Single source of truth: the inline style block owns
                // border-left-{width,style,color}. The className keeps only
                // background + text-color + the bg-transparent baseline so
                // there is no overlap with the inline style.
                className={cn(
                  "w-full flex items-center gap-[10px] py-[9px] px-[12px] rounded-[8px]",
                  "text-[0.82rem] font-medium cursor-pointer transition-claude-fast",
                  "hover:bg-[#efede6] hover:text-[#2d2d2a]",
                  isActive && "bg-[rgba(217,119,87,0.11)] text-[#d97757] font-semibold",
                  !isActive && "text-[#6b6b65]",
                  "bg-transparent border-0"
                )}
                style={{
                  borderLeftWidth: "2px",
                  borderLeftStyle: "solid",
                  borderLeftColor: isActive ? "#d97757" : "transparent",
                }}
              >
                <Icon
                  size={16}
                  className={cn(
                    "flex-shrink-0",
                    item.isDanger ? "text-[#cc4455]" : isActive ? "text-[#d97757]" : "text-[#6b6b65]"
                  )}
                />
                <span>{t(item.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
