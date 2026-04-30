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
  key: "dashboard" | "timetable" | "courses" | "deadlines" | "predict" | "digest" | "settings";
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
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)]",
        "bg-dark flex flex-col py-5 z-[100]",
        // Shortened from 0.28s — user perceives lag is halved; each frame's
        // layout cost is unchanged but fewer frames are painted total.
        "transition-[width] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]",
        // Paint-cheap right-edge separator. The previous
        // `shadow-[2px_0_16px_rgba(20,20,19,.06)]` extended ~18 px into main
        // content; the `[contain:layout_paint]` below only isolates the
        // sidebar's INTERNAL paint, not the blur that bleeds out. During the
        // width animation the browser re-rasterised the shadow region on
        // every frame, which on content-dense pages (timetable: 7×30 grid
        // lines + events + overlays) stalled the compositor. A 1 px border
        // paints inside the contain box, costs nothing per frame, and keeps
        // the visual separation.
        "overflow-hidden border-r border-[rgba(20,20,19,.08)]",
        "hover:w-[var(--spacing-sidebar-w-expanded)] group",
        // Isolate layout + paint so the width-transition redraw cost stays
        // inside the sidebar subtree and does not ripple into main content
        // on every animation frame.
        "[contain:layout_paint]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-[17px] pb-6 pt-[6px] whitespace-nowrap w-full">
        <div className="w-[34px] h-[34px] bg-orange rounded-[9px] grid place-items-center flex-shrink-0 font-serif font-bold text-[17px] text-white">
          U
        </div>
        <span className="font-serif text-[1.18rem] font-bold text-[#4a3f34] opacity-0 group-hover:opacity-100 transition-opacity duration-[0.28s]">
          UniBoard
        </span>
      </div>

      {/* Rule — hover-expand is instantaneous; an animated calc() width
          compounded style-recalc cost across every sidebar hover frame. */}
      <div className="w-[26px] h-px bg-[rgba(60,50,40,.1)] mx-auto mb-[10px] group-hover:w-[calc(100%-44px)]" />

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
                  "cursor-pointer transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] whitespace-nowrap overflow-hidden no-underline",
                  active
                    ? "bg-[rgba(217,119,87,.18)] text-orange"
                    : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
                )}
              >
                <Icon className="flex-shrink-0 w-5 h-5" />
                <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-[0.28s]">
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
                "cursor-pointer transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] whitespace-nowrap overflow-hidden no-underline",
                active
                  ? "bg-[rgba(217,119,87,.18)] text-orange"
                  : "text-[rgba(60,50,40,.65)] hover:bg-[rgba(60,50,40,.06)] hover:text-[rgba(60,50,40,.75)]"
              )}
            >
              <Icon className="flex-shrink-0 w-5 h-5" />
              <span className="text-[0.84rem] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-[0.28s]">
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
