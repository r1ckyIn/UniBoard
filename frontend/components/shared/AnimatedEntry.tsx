"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const DELAY_MAP: Record<number, string> = {
  1: "delay-[0.04s]",
  2: "delay-[0.09s]",
  3: "delay-[0.14s]",
  4: "delay-[0.19s]",
  5: "delay-[0.28s]",
  6: "delay-[0.38s]",
  7: "delay-[0.48s]",
  8: "delay-[0.56s]",
  9: "delay-[0.64s]",
  10: "delay-[0.72s]",
};

interface AnimatedEntryProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function AnimatedEntry({
  children,
  delay = 1,
  className,
}: AnimatedEntryProps) {
  return (
    <div
      className={cn(
        "opacity-0 animate-slide-up",
        DELAY_MAP[delay] || "",
        className
      )}
      style={{ animationFillMode: "forwards" }}
    >
      {children}
    </div>
  );
}
