"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Clock,
  TrendingUp,
  Newspaper,
  Settings,
} from "lucide-react";
import clsx from "clsx";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

const NAV_ITEMS = [
  { icon: LayoutDashboard, key: "dashboard", path: "" },
  { icon: Calendar, key: "timetable", path: "/timetable" },
  { icon: BookOpen, key: "courses", path: "/courses" },
  { icon: Clock, key: "deadlines", path: "/deadlines" },
  { icon: TrendingUp, key: "predict", path: "/predict" },
  { icon: Newspaper, key: "digest", path: "/digest" },
] as const;

const BOTTOM_ITEM = { icon: Settings, key: "settings", path: "/settings" } as const;

/**
 * Collapsible sidebar navigation.
 * Default width: 68px (--sidebar-w).
 * On hover: 224px (--sidebar-w-expanded) with label fade-in.
 */
export default function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locale = useLocale();

  function isActive(itemPath: string): boolean {
    const fullPath = `/${locale}${itemPath}`;
    if (itemPath === "") {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-[100] flex flex-col overflow-hidden"
      style={{
        width: hovered ? "var(--sidebar-w-expanded)" : "var(--sidebar-w)",
        background: "var(--color-dark)",
        transition: "width var(--ease)",
        boxShadow: "2px 0 16px rgba(20,20,19,.06)",
        padding: "20px 0",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 whitespace-nowrap w-full" style={{ padding: "6px 17px 24px" }}>
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 34,
            height: 34,
            background: "var(--color-orange)",
            borderRadius: 9,
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            fontSize: 17,
            color: "#fff",
          }}
        >
          U
        </div>
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.18rem",
            fontWeight: 700,
            color: "#4a3f34",
            opacity: hovered ? 1 : 0,
            transition: "opacity var(--ease)",
          }}
        >
          UniBoard
        </span>
      </div>

      {/* Horizontal rule */}
      <div
        className="mx-auto"
        style={{
          width: hovered ? "calc(100% - 44px)" : 26,
          height: 1,
          background: "rgba(60,50,40,.1)",
          marginBottom: 10,
          transition: "width var(--ease)",
        }}
      />

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 flex-1 w-full" style={{ padding: "0 10px" }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={`/${locale}${item.path}`}
              className={clsx(
                "flex items-center gap-[14px] whitespace-nowrap overflow-hidden no-underline",
                "rounded-[10px] cursor-pointer"
              )}
              style={{
                padding: "11px 14px",
                color: active ? "var(--color-orange)" : "rgba(60,50,40,.65)",
                background: active ? "rgba(217,119,87,.18)" : "transparent",
                transition: "all var(--ease-fast)",
              }}
            >
              <Icon size={20} className="shrink-0" />
              <span
                className="text-sm font-medium"
                style={{
                  opacity: hovered ? 1 : 0,
                  transition: "opacity var(--ease)",
                  fontSize: ".84rem",
                }}
              >
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Notification bell */}
      <div className="relative" style={{ padding: "0 10px", marginBottom: 4 }}>
        <div
          className={clsx(
            "flex items-center gap-[14px] whitespace-nowrap overflow-hidden",
            "rounded-[10px]"
          )}
          style={{ padding: "4px 8px" }}
        >
          <NotificationBell />
          <span
            className="text-sm font-medium"
            style={{
              opacity: hovered ? 1 : 0,
              transition: "opacity var(--ease)",
              fontSize: ".84rem",
              color: "rgba(60,50,40,.65)",
            }}
          >
            {t("notifications")}
          </span>
        </div>
        <NotificationDropdown />
      </div>

      {/* Bottom: Settings */}
      <div style={{ padding: "0 10px" }}>
        <Link
          href={`/${locale}${BOTTOM_ITEM.path}`}
          className={clsx(
            "flex items-center gap-[14px] whitespace-nowrap overflow-hidden no-underline",
            "rounded-[10px] cursor-pointer"
          )}
          style={{
            padding: "11px 14px",
            color: isActive(BOTTOM_ITEM.path) ? "var(--color-orange)" : "rgba(60,50,40,.65)",
            background: isActive(BOTTOM_ITEM.path) ? "rgba(217,119,87,.18)" : "transparent",
            transition: "all var(--ease-fast)",
          }}
        >
          <Settings size={20} className="shrink-0" />
          <span
            className="text-sm font-medium"
            style={{
              opacity: hovered ? 1 : 0,
              transition: "opacity var(--ease)",
              fontSize: ".84rem",
            }}
          >
            {t(BOTTOM_ITEM.key)}
          </span>
        </Link>
      </div>
    </aside>
  );
}
