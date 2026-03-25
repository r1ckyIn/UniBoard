"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Settings } from "lucide-react";

import { useCurrentUser } from "@/hooks/use-user";
import { useSyncStatus } from "@/hooks/use-sync";
import SettingsNav from "@/components/settings/SettingsNav";
import TokensSection from "@/components/settings/TokensSection";
import GpaTargetSection from "@/components/settings/GpaTargetSection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import CourseLinkingSection from "@/components/settings/CourseLinkingSection";
import ProfileSection from "@/components/settings/ProfileSection";
import DangerZoneSection from "@/components/settings/DangerZoneSection";
import SettingsAccountCard from "@/components/settings/SettingsAccountCard";
import SettingsSyncCard from "@/components/settings/SettingsSyncCard";
import SettingsQuickActions from "@/components/settings/SettingsQuickActions";
import SettingsAboutCard from "@/components/settings/SettingsAboutCard";
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
 * and renders all 6 section components with 4 right panel cards.
 */
export default function SettingsPage() {
  const t = useTranslations("settings");

  // Data hooks
  const userData = useCurrentUser();
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

  // ── Section renderer ─────────────────────────────────────────
  const user = userData.data?.data;

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "sec-tokens":
        return user ? (
          <>
            <h2 className="font-serif text-[1.05rem] font-semibold text-[#2d2d2a] mb-[6px]">{t("tokens.title")}</h2>
            <p className="text-[0.82rem] text-[#6b6b65] mb-[16px]">{t("tokens.desc")}</p>
            <TokensSection user={user} />
          </>
        ) : null;
      case "sec-gpa":
        return user ? (
          <>
            <h2 className="font-serif text-[1.05rem] font-semibold text-[#2d2d2a] mb-[6px]">{t("gpa.title")}</h2>
            <p className="text-[0.82rem] text-[#6b6b65] mb-[16px]">{t("gpa.desc")}</p>
            <GpaTargetSection user={user} />
          </>
        ) : null;
      case "sec-notifications":
        return (
          <>
            <h2 className="font-serif text-[1.05rem] font-semibold text-[#2d2d2a] mb-[6px]">{t("notifications.title")}</h2>
            <p className="text-[0.82rem] text-[#6b6b65] mb-[16px]">{t("notifications.desc")}</p>
            <NotificationsSection />
          </>
        );
      case "sec-courses":
        return <CourseLinkingSection />;
      case "sec-profile":
        return user ? <ProfileSection user={user} /> : null;
      case "sec-danger":
        return <DangerZoneSection />;
      default:
        return null;
    }
  };

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

          {/* Section cards */}
          {SECTION_META.map((section) => (
            <div key={section.id} id={section.id}>
              <AnimatedEntry delay={section.animDelay}>
                <RoughCard>
                  {renderSection(section.id)}
                </RoughCard>
              </AnimatedEntry>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel portal content */}
      {portalTarget && user &&
        createPortal(
          <>
            <AnimatedEntry delay={2}>
              <SettingsAccountCard user={user} courseCount={5} wam={user.gpa_target ?? 77.5} />
            </AnimatedEntry>

            <AnimatedEntry delay={4}>
              <SettingsSyncCard />
            </AnimatedEntry>

            <AnimatedEntry delay={6}>
              <SettingsQuickActions />
            </AnimatedEntry>

            <AnimatedEntry delay={8}>
              <SettingsAboutCard user={user} />
            </AnimatedEntry>
          </>,
          portalTarget
        )}
    </>
  );
}
