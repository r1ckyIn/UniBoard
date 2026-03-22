"use client";

import { useTranslations } from "next-intl";
import { User, Settings, Key, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ────────────────────────────────────────────────────────────────────
interface AvatarMenuProps {
  user: {
    name: string;
    email: string;
    initials: string;
  };
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AvatarMenu({
  user,
  onNavigate,
  onLogout,
}: AvatarMenuProps) {
  const t = useTranslations("dashboard");

  const menuItems = [
    {
      icon: User,
      label: t("avatarMenu.profile"),
      onClick: () => onNavigate("/settings"),
    },
    {
      icon: Settings,
      label: t("avatarMenu.settings"),
      onClick: () => onNavigate("/settings"),
    },
    {
      icon: Key,
      label: t("avatarMenu.apiTokens"),
      onClick: () => onNavigate("/setup"),
    },
  ];

  return (
    <div
      className={cn(
        "absolute top-[calc(100%+12px)] right-0",
        "bg-white rounded-[12px] border-[1.5px] border-card-border",
        "shadow-dropdown z-[200] overflow-hidden",
        "animate-drop-in w-[240px]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow notch */}
      <div className="absolute -top-[7px] right-[14px] w-3 h-3 bg-white border-t-[1.5px] border-l-[1.5px] border-card-border rotate-45 z-[1]" />

      {/* Header with avatar */}
      <div className="flex gap-3 items-center p-4">
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-orange to-[#e8956e] grid place-items-center text-white font-serif font-bold text-[17px] flex-shrink-0">
          {user.initials.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-[0.88rem]">{user.name}</div>
          <div className="text-[0.72rem] text-text-3">{user.email}</div>
        </div>
      </div>

      <div className="h-px bg-divider my-1" />

      {/* Navigation menu items */}
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 text-[0.82rem] text-text-2",
            "transition-colors duration-[0.15s] hover:bg-card-bg-hover hover:text-text-1",
            "cursor-pointer border-none bg-transparent text-left"
          )}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </button>
      ))}

      <div className="h-px bg-divider my-1" />

      {/* Logout */}
      <button
        onClick={onLogout}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-3 text-[0.82rem] text-[#cc4455]",
          "transition-colors duration-[0.15s] hover:bg-[rgba(204,68,85,.05)]",
          "cursor-pointer border-none bg-transparent text-left"
        )}
      >
        <LogOut className="w-4 h-4" />
        {t("avatarMenu.logout")}
      </button>
    </div>
  );
}
