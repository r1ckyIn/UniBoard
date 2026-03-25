"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-user";
import { useSyncStatus } from "@/hooks/use-sync";
import SettingsNav from "@/components/settings/SettingsNav";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import RoughCard from "@/components/design-system/RoughCard";

// Section IDs matching prototype order
const SECTION_IDS = [
  "sec-tokens",
  "sec-gpa",
  "sec-notifications",
  "sec-courses",
  "sec-profile",
  "sec-danger",
] as const;

// Section meta for placeholder cards
const SECTION_META = [
  { id: "sec-tokens", titleKey: "tokens.title", descKey: "tokens.desc", animDelay: 1 as const },
  { id: "sec-gpa", titleKey: "gpa.title", descKey: "gpa.desc", animDelay: 2 as const },
  { id: "sec-notifications", titleKey: "notifications.title", descKey: "notifications.desc", animDelay: 3 as const },
  { id: "sec-courses", titleKey: "courses.title", descKey: "courses.desc", animDelay: 4 as const },
  { id: "sec-profile", titleKey: "profile.title", descKey: "profile.desc", animDelay: 5 as const },
  { id: "sec-danger", titleKey: "danger.title", descKey: "danger.disconnect.desc", animDelay: 6 as const },
] as const;

/**
 * SettingsPage orchestrator.
 * Manages scroll-spy navigation, portal for right panel,
 * and renders section placeholder cards that Plan 02/03 will replace.
 */
export default function SettingsPage() {
  const t = useTranslations("settings");

  // Data hooks (used by section components in Plan 02/03)
  useCurrentUser();
  useSyncStatus();

  // ── Portal target ─────────────────────────────────────────────
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("right-panel-slot"));
  }, []);

  // ── Scroll-spy state ──────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<string>(SECTION_IDS[0]);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
    );

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ── Nav click handler ─────────────────────────────────────────
  const handleNavClick = useCallback((sectionId: string) => {
    isScrollingRef.current = true;
    setActiveSection(sectionId);

    const el = document.getElementById(sectionId);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }

    // Reset scroll lock after smooth scroll completes
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  }, []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <div className="flex gap-[22px]">
        {/* Left scroll-spy nav */}
        <SettingsNav activeSection={activeSection} onNavClick={handleNavClick} />

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Title row */}
          <AnimatedEntry delay={1}>
            <div className="flex items-center gap-[10px] mb-[4px]">
              <Settings size={24} className="text-[#d97757]" />
              <h1 className="font-serif text-[1.5rem] font-bold text-[#2d2d2a] leading-tight">
                {t("title")}
              </h1>
            </div>
            <p className="text-[0.82rem] text-[#6b6b65]">{t("subtitle")}</p>
          </AnimatedEntry>

          {/* Section placeholder cards */}
          {SECTION_META.map((section) => (
            <div key={section.id} id={section.id}>
              <AnimatedEntry delay={section.animDelay}>
                <RoughCard>
                  <h2 className="font-serif text-[1.05rem] font-semibold text-[#2d2d2a] mb-[6px]">
                    {t(section.titleKey)}
                  </h2>
                  <p className="text-[0.82rem] text-[#6b6b65] mb-[16px]">
                    {t(section.descKey)}
                  </p>
                  <div className="text-[0.78rem] text-[#9b9b94] italic">
                    Section content coming in Plan 02/03
                  </div>
                </RoughCard>
              </AnimatedEntry>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel portal content */}
      {portalTarget &&
        createPortal(
          <>
            <AnimatedEntry delay={2}>
              <RoughCard>
                <div className="text-center py-[12px]">
                  <div className="w-[56px] h-[56px] rounded-[14px] bg-gradient-to-br from-[#d97757] to-[#e8956e] mx-auto mb-[10px] flex items-center justify-center text-white font-bold text-[20px] font-serif">
                    U
                  </div>
                  <div className="font-serif text-[1.1rem] font-semibold mb-[2px]">Account</div>
                  <div className="text-[0.74rem] text-[#9b9b94]">Account details placeholder</div>
                </div>
              </RoughCard>
            </AnimatedEntry>

            <AnimatedEntry delay={4}>
              <RoughCard>
                <div className="text-[0.82rem] font-semibold flex items-center gap-[7px] mb-[12px] text-[#2d2d2a]">
                  <span className="text-[#d97757]">&#9679;</span>
                  {t("rightPanel.syncStatus")}
                </div>
                <div className="text-[0.78rem] text-[#9b9b94] italic">
                  Sync status placeholder
                </div>
              </RoughCard>
            </AnimatedEntry>

            <AnimatedEntry delay={6}>
              <RoughCard>
                <div className="text-[0.82rem] font-semibold mb-[12px] text-[#2d2d2a]">
                  {t("rightPanel.quickActions")}
                </div>
                <div className="text-[0.78rem] text-[#9b9b94] italic">
                  Quick actions placeholder
                </div>
              </RoughCard>
            </AnimatedEntry>

            <AnimatedEntry delay={8}>
              <RoughCard>
                <div className="text-[0.82rem] font-semibold mb-[12px] text-[#2d2d2a]">
                  {t("rightPanel.about")}
                </div>
                <div className="text-[0.78rem] text-[#9b9b94] italic">
                  About placeholder
                </div>
              </RoughCard>
            </AnimatedEntry>
          </>,
          portalTarget
        )}
    </>
  );
}
