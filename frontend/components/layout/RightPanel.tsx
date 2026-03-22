"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

export default function RightPanel() {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide scrollbar: add 'scrolling' class on scroll, remove after 1200ms
  const handleScroll = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.classList.add("scrolling");
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      panel.classList.remove("scrolling");
    }, 1200);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.addEventListener("scroll", handleScroll);
    return () => {
      panel.removeEventListener("scroll", handleScroll);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [handleScroll]);

  return (
    <div
      ref={panelRef}
      className={cn(
        "w-[var(--spacing-right-panel-w)] flex-shrink-0",
        "hidden xl:flex xl:flex-col",
        "gap-[18px] sticky top-[calc(var(--spacing-header-h)+28px)]",
        "self-start max-h-[calc(100vh-var(--spacing-header-h)-56px)]",
        "overflow-y-auto overflow-x-hidden",
        // Auto-hide scrollbar styles
        "[&::-webkit-scrollbar-thumb]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:transition-[background]",
        "[&::-webkit-scrollbar-thumb]:duration-300",
        "[&.scrolling::-webkit-scrollbar-thumb]:bg-card-border"
      )}
    >
      <div id="right-panel-slot" className="flex flex-col gap-5" />
    </div>
  );
}
