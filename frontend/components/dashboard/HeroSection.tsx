"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, type Variants } from "motion/react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
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

export default function HeroSection({ userName, onScrollClick }: HeroSectionProps) {
  const t = useTranslations("dashboard");
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

  // Date line
  const weekday = format(new Date(), "EEEE");

  // Encouragement text
  const encouragement = defaultEncouragementProvider(mockActivity, t);

  // Show Rough Notation annotations one-by-one with staggered delays
  // Underline at 900ms (duration 600ms), circle at 1500ms (duration 800ms), highlight at 2300ms (duration 1000ms)
  useEffect(() => {
    const t1 = setTimeout(() => setShowUnderline(true), 900);
    const t2 = setTimeout(() => setShowCircle(true), 1500);
    const t3 = setTimeout(() => setShowHighlight(true), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Parallax fade-out on scroll
  const handleScroll = useCallback(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    if (!hero || !content) return;

    const heroHeight = hero.offsetHeight;
    if (heroHeight === 0) return;

    const scrollY =
      typeof window !== "undefined" ? window.scrollY || window.pageYOffset : 0;
    const opacity = Math.max(0, 1 - scrollY / heroHeight);
    content.style.opacity = String(opacity);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [handleScroll]);

  // Split the encouragement message to wrap the highlightPhrase
  const renderEncouragement = () => {
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
          animationDuration={1000}
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
    const parts = dateText.split(/(__ WEEKDAY__|__WEEKDAY__|__WEEKNUMBER__|__ WEEKNUMBER__)/);
    return parts.map((part, i) => {
      if (part === "__WEEKDAY__") {
        return (
          <RoughNotationWrapper
            key={i}
            type="underline"
            color="#d97757"
            show={showUnderline}
            animationDuration={600}
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
            animationDuration={800}
            strokeWidth={2}
            padding={4}
          >
            Week 4
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
