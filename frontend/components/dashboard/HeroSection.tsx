"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import HeroDoodles from "@/components/design-system/HeroDoodles";
import {
  RoughNotationItem,
  RoughNotationSequence,
} from "@/components/design-system/RoughNotationWrapper";
import { formatGreeting, formatWeekday } from "@/lib/utils/dates";

interface HeroSectionProps {
  displayName: string;
  wam?: number;
}

/**
 * Full-viewport hero section at the top of the dashboard.
 * Shows greeting, date, academic week, encouragement message,
 * and a breathing scroll prompt at the bottom.
 */
export default function HeroSection({ displayName, wam }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to let the page settle before triggering annotations
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const greeting = formatGreeting();
  const weekday = formatWeekday();
  const dateString = format(new Date(), "MMMM d, yyyy");

  return (
    <section
      className="relative flex flex-col items-center justify-center min-h-screen"
      style={{ minHeight: "100vh" }}
    >
      {/* Background doodles */}
      <HeroDoodles />

      {/* Center content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <RoughNotationSequence show={mounted}>
          {/* Greeting */}
          <h1
            className="text-4xl mb-3"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.4rem",
              lineHeight: 1.3,
            }}
          >
            {greeting}, {displayName}
          </h1>

          {/* Date line with weekday annotation */}
          <p
            className="text-lg mb-4"
            style={{ color: "var(--color-text-2)" }}
          >
            <RoughNotationItem
              type="underline"
              color="var(--color-orange)"
              order={1}
            >
              {weekday}
            </RoughNotationItem>
            {" "}&mdash; {dateString}
          </p>

          {/* Week indicator */}
          <p
            className="text-base mb-6"
            style={{ color: "var(--color-text-2)" }}
          >
            <RoughNotationItem
              type="circle"
              color="var(--color-blue)"
              order={2}
            >
              Semester in progress
            </RoughNotationItem>
          </p>

          {/* Encouragement text */}
          <p
            className="text-lg mb-4"
            style={{
              color: "var(--color-text-2)",
              fontStyle: "italic",
              lineHeight: 1.6,
            }}
          >
            <RoughNotationItem
              type="highlight"
              color="var(--color-green-soft)"
              order={3}
            >
              {"Let's check on your progress today."}
            </RoughNotationItem>
          </p>

          {/* WAM display when available */}
          {wam !== undefined && (
            <p
              className="text-2xl mt-4 mb-2"
              style={{
                fontFamily: "var(--font-serif)",
                color: "var(--color-text-1)",
              }}
            >
              Current WAM:{" "}
              <RoughNotationItem
                type="circle"
                color="var(--color-orange)"
                order={4}
              >
                <span className="font-bold">{wam.toFixed(1)}</span>
              </RoughNotationItem>
            </p>
          )}
        </RoughNotationSequence>
      </div>

      {/* Scroll prompt */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
        style={{ zIndex: 10 }}
      >
        <a
          href="#dashboard-data"
          className="scroll-prompt text-sm tracking-wide"
          style={{ color: "var(--color-text-3)", textDecoration: "none" }}
        >
          your dashboard &darr;
        </a>
      </div>

      {/* Breathing animation for scroll prompt */}
      <style jsx>{`
        .scroll-prompt {
          animation: breathe 2s ease-in-out infinite;
        }
        @keyframes breathe {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}
