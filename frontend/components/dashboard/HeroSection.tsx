"use client";

import { useRef, useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";
import { enUS } from "date-fns/locale/en-US";
import { ChevronDown } from "lucide-react";
import RoughNotationWrapper from "@/components/design-system/RoughNotationWrapper";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import { defaultEncouragementProvider } from "@/lib/dashboard/encouragement";

const HeroDoodles = withClientOnly(
  () => import("@/components/design-system/HeroDoodles")
);

interface HeroSectionProps {
  userName: string;
  onScrollClick: () => void;
  // Phase 34 AIFEAT-01 / D-A1: daily AI study suggestion (20-30 words).
  // Empty string or null triggers the D-D1 fallback chain:
  //   mainSuggestion (AI prose)
  //     -> top3Items[0] (deterministic ROI fallback)
  //       -> defaultEncouragementProvider (generic encouragement)
  mainSuggestion?: string | null;
  top3Items?: { course_code: string; assessment_name: string; weight: number }[] | null;
}

/**
 * Deterministic fallback line derived from the highest-ROI item when the
 * AI prose main_suggestion is empty. Per D-D1: rule-engine fallback never
 * leaks internal fallback vocabulary — just a plain focus hint.
 */
function formatRoiFallbackLine(
  item: { course_code: string; assessment_name: string; weight: number },
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const pct = Math.round(item.weight * 100);
  return t("hero.roiFallback", {
    course: item.course_code,
    assessment: item.assessment_name,
    weight: pct,
  });
}

/**
 * Compute time-of-day greeting key based on current hour.
 * 5-11 = morning, 12-17 = afternoon, 18+ or <5 = evening
 */
function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

// Motion spring entrance variants
const heroVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 200,
      delay,
    },
  }),
};

// Mock activity data for encouragement text
const mockActivity = {
  completedDeadlinesLast7Days: 2,
  recentCompletedItems: ["COMP2017 lab", "the stats quiz"],
};

export default function HeroSection({
  userName,
  onScrollClick,
  mainSuggestion,
  top3Items,
}: HeroSectionProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const dateFnsLocale = locale === "zh" ? zhCN : enUS;
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUnderline, setShowUnderline] = useState(false);
  const [showCircle, setShowCircle] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  // Extract first name from userName
  const firstName = userName.split(" ")[0];

  // Time-of-day greeting
  const timeOfDay = getTimeOfDay();
  const greeting = t(`hero.greeting.${timeOfDay}`, { firstName });

  // Date line — locale-aware weekday (e.g. "Monday" in en, full-form weekday in zh)
  const weekday = format(new Date(), "EEEE", { locale: dateFnsLocale });

  // Encouragement text — 3-stage fallback chain (D-D1):
  //   1. AI prose main_suggestion (when non-empty)
  //   2. Top-3 ROI deterministic fallback (when prose empty but Top-3 present)
  //   3. defaultEncouragementProvider (new-user / neither-available)
  const fallbackEncouragement = defaultEncouragementProvider(mockActivity, t);
  const aiSuggestion = mainSuggestion?.trim() ?? "";
  const heroLine =
    aiSuggestion.length > 0
      ? aiSuggestion
      : top3Items && top3Items.length > 0
        ? formatRoiFallbackLine(top3Items[0], t)
        : fallbackEncouragement.message;
  // Only render the animated rough-notation highlight when we're on the
  // third-stage default encouragement (the AI prose / ROI fallback don't
  // contain the highlightPhrase).
  const useAnimatedHighlight = aiSuggestion.length === 0 && !(top3Items && top3Items.length > 0);
  const encouragement = fallbackEncouragement;

  // Staggered Rough Notation annotations — compressed from the original
  // [900/1500/2300]ms schedule to [400/700/1000]ms so the hero's entrance
  // phase settles in ~1.5s instead of ~3.3s. During the entrance window the
  // SVG path dashoffset animations dominated the compositor queue, so
  // sidebar hover on dashboard felt laggy until users waited ~5s for the
  // hero to quiesce. Stagger is preserved, just tighter.
  useEffect(() => {
    const t1 = setTimeout(() => setShowUnderline(true), 400);
    const t2 = setTimeout(() => setShowCircle(true), 700);
    const t3 = setTimeout(() => setShowHighlight(true), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Parallax fade-out on scroll (main is the scroll container)
  useEffect(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    const scrollContainer = hero?.closest("main");
    if (!hero || !content || !scrollContainer) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const heroHeight = hero.offsetHeight;
        if (heroHeight === 0) return;
        const opacity = Math.max(0, 1 - scrollContainer.scrollTop / heroHeight);
        content.style.opacity = String(opacity);
      });
    };

    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Split the encouragement message to wrap the highlightPhrase (only when
  // we're on the third-stage default fallback — AI prose / ROI fallback lines
  // don't contain the highlightPhrase so we render them plain).
  const renderEncouragement = () => {
    if (!useAnimatedHighlight) {
      return <span>{heroLine}</span>;
    }
    const { message, highlightPhrase } = encouragement;
    const idx = message.indexOf(highlightPhrase);
    if (idx === -1) {
      return <span>{message}</span>;
    }
    const before = message.slice(0, idx);
    const after = message.slice(idx + highlightPhrase.length);
    return (
      <>
        {before}
        <RoughNotationWrapper
          type="highlight"
          color="rgba(217,119,87,0.10)"
          show={showHighlight}
          animationDuration={500}
          padding={4}
        >
          {highlightPhrase}
        </RoughNotationWrapper>
        {after}
      </>
    );
  };

  // Build the date line with Rough Notation annotations on weekday and "Week 4"
  const dateText = t("hero.date", {
    weekday: "__WEEKDAY__",
    weekNumber: "__WEEKNUMBER__",
    semester: "1",
  });

  const renderDateLine = () => {
    // Split date text around placeholders
    const parts = dateText.split(/(__WEEKDAY__|__WEEKNUMBER__)/);
    return parts.map((part, i) => {
      if (part === "__WEEKDAY__") {
        return (
          <RoughNotationWrapper
            key={i}
            type="underline"
            color="#d97757"
            show={showUnderline}
            animationDuration={500}
            strokeWidth={2}
            padding={2}
          >
            {weekday}
          </RoughNotationWrapper>
        );
      }
      if (part === "__WEEKNUMBER__") {
        return (
          <RoughNotationWrapper
            key={i}
            type="circle"
            color="#6a9bcc"
            show={showCircle}
            animationDuration={500}
            strokeWidth={2}
            padding={4}
          >
            {t("hero.weekLabel", { weekNumber: "4" })}
          </RoughNotationWrapper>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      ref={heroRef}
      className="relative flex flex-col items-start overflow-hidden"
      style={{
        minHeight: "calc(100vh - 56px)",
        padding: "15vh 48px 40px",
      }}
    >
      {/* Background doodles at z-0 */}
      <div className="absolute inset-0 z-0">
        <HeroDoodles />
      </div>

      {/* Hero content with parallax fade */}
      <div ref={contentRef} className="relative z-[1] max-w-[600px]">
        {/* Greeting */}
        <motion.h1
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          custom={0.1}
          className="font-serif text-text-1 mb-5"
          style={{
            fontSize: "2.8rem",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {greeting}
        </motion.h1>

        {/* Date line */}
        <motion.p
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          custom={0.35}
          className="font-sans text-text-2 mb-5"
          style={{
            fontSize: "1.2rem",
            fontWeight: 400,
            lineHeight: 1.6,
          }}
        >
          {renderDateLine()}
        </motion.p>

        {/* Encouragement text */}
        <motion.p
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          custom={0.6}
          className="font-sans text-text-2 italic"
          style={{
            fontSize: "1.2rem",
            fontWeight: 400,
            lineHeight: 1.65,
          }}
        >
          {renderEncouragement()}
        </motion.p>
      </div>

      {/* Scroll prompt — absolute positioned */}
      <motion.button
        variants={heroVariants}
        initial="hidden"
        animate="visible"
        custom={1.0}
        onClick={onScrollClick}
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none"
        style={{ bottom: "18vh" }}
        aria-label={t("hero.scrollPrompt")}
      >
        <span
          className="font-serif text-text-3 italic"
          style={{
            fontSize: "1rem",
            fontWeight: 400,
            letterSpacing: "0.04em",
            opacity: 0.5,
          }}
        >
          {t("hero.scrollPrompt")}
        </span>
        <ChevronDown
          size={24}
          strokeWidth={1.8}
          className="text-text-3 animate-gentle-bob"
          style={{ opacity: 0.5 }}
        />
      </motion.button>
    </div>
  );
}
