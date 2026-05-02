"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  CalendarDays,
  Target,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  key:
    | "dashboard"
    | "timetable"
    | "courses"
    | "deadlines"
    | "predict"
    | "digest"
    | "settings";
  icon: LucideIcon;
  href: string;
}

const navItems: NavItem[] = [
  { key: "dashboard", icon: LayoutDashboard, href: "/" },
  { key: "timetable", icon: Calendar, href: "/timetable" },
  { key: "courses", icon: BookOpen, href: "/courses" },
  { key: "deadlines", icon: CalendarDays, href: "/deadlines" },
  { key: "predict", icon: Target, href: "/predict" },
  { key: "digest", icon: Radio, href: "/digest" },
];

const bottomItems: NavItem[] = [
  { key: "settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    // Outer 68px shell — stable layout occupier; main content's
    // padding-left:68px never shifts. `group` enables hover detection
    // for the inner panel transform. `[contain:layout_paint]` confines
    // paint cost to this subtree (Phase 39 LEARNINGS — preserved).
    // 1px right border replaces the v2.0 bleeding shadow that caused
    // the original Intel Mac stall (Quick Task 260420-n29 fix).
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)] z-[100]",
        "overflow-hidden border-r border-[rgba(20,20,19,.08)]",
        "[contain:layout_paint]",
        "group"
      )}
    >
      {/* Inner 224px panel — translates from -156px to 0 on hover.
          GPU-composited; no layout reflow on parent or main content.
          Per RESEARCH Pattern 5 + Task 1 SPIKE Option A literal D-40-08. */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[var(--spacing-sidebar-w-expanded)]",
          "bg-dark flex flex-col py-5",
          "translate-x-[-156px] group-hover:translate-x-0",
          "transition-claude-base will-change-transform",
          "[contain:layout_paint]"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-[17px] pb-6 pt-[6px] whitespace-nowrap w-full">
          <div className="w-[34px] h-[34px] bg-orange rounded-[9px] grid place-items-center flex-shrink-0 font-serif font-bold text-[17px] text-white">
            U
          </div>
          <span className="font-serif text-[1.18rem] font-bold text-[#4a3f34] opacity-0 group-hover:opacity-100 transition-claude-base">
            UniBoard
          </span>
        </div>

        {/* Rule */}
        <div className="w-[26px] h-px bg-[rgba(60,50,40,.1)] mx-auto mb-[10px] group-hover:w-[calc(100%-44px)] transition-claude-base" />

        {/* Main nav */}
        <ul className="list-none w-full flex-1 flex flex-col gap-[2px] px-[10px]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-[14px] py-[11px] px-[14px] rounded-[10px]",
                    "cursor-pointer transition-claude-fast whitespace-nowrap overflow-hidden no-underline",
                    active
                      ? "bg-orange-soft text-orange"
                      : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
                  )}
                >
                  <Icon className="flex-shrink-0 w-5 h-5" />
                  <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-claude-base">
                    {t(item.key)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom nav */}
        <div className="mt-auto px-[10px]">
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-[14px] py-[11px] px-[14px] rounded-[10px]",
                  "cursor-pointer transition-claude-fast whitespace-nowrap overflow-hidden no-underline",
                  active
                    ? "bg-orange-soft text-orange"
                    : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
                )}
              >
                <Icon className="flex-shrink-0 w-5 h-5" />
                <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-claude-base">
                  {t(item.key)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
