"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/initials";
import { useAuthStore } from "@/lib/auth/store";
import { useLogout } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import NotificationPanel from "./NotificationPanel";
import AvatarMenu from "./AvatarMenu";

export default function Header() {
  const t = useTranslations("header");
  const router = useRouter();
  const locale = useLocale();
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Data sources
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const notifications = useNotifications();

  const initials = useMemo(
    () => getInitials(user?.displayName ?? "U"),
    [user?.displayName]
  );

  // Check if there are unread notifications
  const hasUnread = useMemo(() => {
    const items = notifications.data?.data;
    return items?.some((n) => !n.is_read) ?? false;
  }, [notifications.data?.data]);

  // Close dropdowns on outside click (only listen when a dropdown is open)
  useEffect(() => {
    if (!notifOpen && !avatarOpen) return;

    function handleClick(e: MouseEvent) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (avatarOpen && avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [notifOpen, avatarOpen]);

  return (
    // Do not re-introduce `backdrop-blur-*` here — full-viewport
    // backdrop-filter is O(w×h) on the GPU raster pipeline and stalls the
    // compositor on Intel Mac whenever any paint invalidates under the
    // header (e.g. sidebar hover, route transitions), producing 2-5 fps
    // while rAF still ticks at 60 Hz. Background alpha was raised from
    // .82 to .97 to preserve the frosted-glass look without the blur.
    <header
      className={cn(
        "sticky top-0 z-50 h-[var(--spacing-header-h)]",
        "bg-[rgba(250,249,245,.97)]",
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
            "transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]",
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
              "transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] hover:bg-card-bg-hover relative"
            )}
          >
            <Bell className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute top-[6px] right-[6px] w-[7px] h-[7px] bg-orange rounded-full border-[1.5px] border-card-bg" />
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <NotificationPanel
              notifications={notifications.data?.data ?? []}
              onViewAll={() => {
                setNotifOpen(false);
              }}
              onItemClick={() => {
                setNotifOpen(false);
              }}
            />
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
            {initials}
          </button>

          {/* Avatar dropdown */}
          {avatarOpen && (
            <AvatarMenu
              user={{
                name: user?.displayName ?? "User",
                email: user?.email ?? "",
                initials,
              }}
              onNavigate={(path) => {
                setAvatarOpen(false);
                router.push(`/${locale}${path}`);
              }}
              onLogout={() => {
                setAvatarOpen(false);
                logoutMutation.mutate(undefined, {
                  onSuccess: () => {
                    router.replace(`/${locale}/auth`);
                  },
                });
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
