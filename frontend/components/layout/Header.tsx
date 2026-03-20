"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Search, Bell, User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function Header() {
  const t = useTranslations("header");
  const navT = useTranslations("nav");
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[var(--spacing-header-h)]",
        "bg-[rgba(250,249,245,.82)] backdrop-blur-[18px]",
        "border-b border-divider",
        "flex items-center justify-between px-8"
      )}
    >
      {/* Brand */}
      <div className="font-serif text-[0.95rem] font-semibold text-text-2">
        {t("brand")}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search bar */}
        <div
          className={cn(
            "flex items-center gap-2 bg-card-bg border border-card-border rounded-[10px]",
            "py-[7px] px-[14px] w-[220px]",
            "transition-all duration-[0.15s]",
            "focus-within:border-orange focus-within:shadow-[0_0_0_3px_var(--color-orange-soft)] focus-within:bg-white"
          )}
        >
          <Search className="w-4 h-4 text-text-3 flex-shrink-0" />
          <input
            type="text"
            placeholder={t("search")}
            className="border-none bg-transparent outline-none font-sans text-[0.82rem] text-text-1 w-full placeholder:text-text-3"
          />
        </div>

        {/* Notification button */}
        <div ref={notifRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotifOpen(!notifOpen);
              setAvatarOpen(false);
            }}
            className={cn(
              "w-9 h-9 rounded-[10px] border border-card-border bg-card-bg",
              "grid place-items-center cursor-pointer text-text-2",
              "transition-all duration-[0.15s] hover:bg-card-bg-hover relative"
            )}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-[6px] right-[6px] w-[7px] h-[7px] bg-orange rounded-full border-[1.5px] border-card-bg" />
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
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

              <div className="font-serif text-[0.88rem] font-semibold px-4 pt-[14px] pb-[10px] text-text-1">
                {t("notifications")}
              </div>
              <div className="max-h-[260px] overflow-y-auto overflow-x-hidden">
                {/* Placeholder notification items */}
                <div className="flex gap-[10px] items-start px-4 py-[10px] bg-[rgba(217,119,87,.05)] cursor-pointer transition-colors duration-[0.15s] hover:bg-[rgba(217,119,87,.09)]">
                  <div className="w-7 h-7 rounded-[7px] bg-green-soft grid place-items-center flex-shrink-0 text-green">
                    <span className="text-xs font-bold">A</span>
                  </div>
                  <div>
                    <div className="text-[0.78rem] text-text-2 leading-[1.4]">
                      <strong className="text-text-1 font-semibold">Assignment 1</strong> graded: 85%
                    </div>
                    <div className="text-[0.66rem] text-text-3 mt-px">2h ago</div>
                  </div>
                </div>
                <div className="flex gap-[10px] items-start px-4 py-[10px] cursor-pointer transition-colors duration-[0.15s] hover:bg-card-bg-hover">
                  <div className="w-7 h-7 rounded-[7px] bg-blue-soft grid place-items-center flex-shrink-0 text-blue">
                    <span className="text-xs font-bold">D</span>
                  </div>
                  <div>
                    <div className="text-[0.78rem] text-text-2 leading-[1.4]">
                      New reply in <strong className="text-text-1 font-semibold">Ed Discussion</strong>
                    </div>
                    <div className="text-[0.66rem] text-text-3 mt-px">5h ago</div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-[10px] text-center text-[0.76rem] font-semibold text-orange border-t border-divider cursor-pointer transition-colors duration-[0.15s] hover:bg-card-bg-hover">
                {t("viewAll")}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAvatarOpen(!avatarOpen);
              setNotifOpen(false);
            }}
            className={cn(
              "w-[34px] h-[34px] rounded-[10px]",
              "bg-gradient-to-br from-orange to-[#e8956e]",
              "grid place-items-center text-white font-semibold text-xs cursor-pointer ml-1"
            )}
          >
            RQ
          </button>

          {/* Avatar dropdown */}
          {avatarOpen && (
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

              {/* Avatar header */}
              <div className="flex gap-3 items-center p-4">
                <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-orange to-[#e8956e] grid place-items-center text-white font-serif font-bold text-[17px] flex-shrink-0">
                  R
                </div>
                <div>
                  <div className="font-semibold text-[0.88rem]">Ricky Qin</div>
                  <div className="text-[0.72rem] text-text-3">rickyqin919@gmail.com</div>
                </div>
              </div>

              <div className="h-px bg-divider my-1" />

              {/* Menu items */}
              <a
                href="#"
                className="flex items-center gap-[10px] px-4 py-[9px] text-[0.82rem] text-text-2 no-underline transition-colors duration-[0.15s] hover:bg-card-bg-hover hover:text-text-1"
              >
                <User className="w-4 h-4" />
                {t("profile")}
              </a>
              <a
                href="#"
                className="flex items-center gap-[10px] px-4 py-[9px] text-[0.82rem] text-text-2 no-underline transition-colors duration-[0.15s] hover:bg-card-bg-hover hover:text-text-1"
              >
                <Settings className="w-4 h-4" />
                {navT("settings")}
              </a>

              <div className="h-px bg-divider my-1" />

              <a
                href="#"
                className="flex items-center gap-[10px] px-4 py-[9px] text-[0.82rem] text-[#c45] no-underline transition-colors duration-[0.15s] hover:bg-[rgba(204,68,85,.05)]"
              >
                <LogOut className="w-4 h-4" />
                {t("logout")}
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
