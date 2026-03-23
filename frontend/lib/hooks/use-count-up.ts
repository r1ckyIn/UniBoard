"use client";
import { useState, useRef, useEffect } from "react";

/**
 * Lightweight rAF-based number animation hook.
 * Animates from previous value to target over `duration` ms with ease-out cubic.
 */
export function useCountUp(
  target: number | null,
  duration = 400
): number | null {
  const [display, setDisplay] = useState<number | null>(target);
  const prevRef = useRef<number | null>(target);

  useEffect(() => {
    if (target === null || prevRef.current === null) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const from = prevRef.current;
    const to = target;
    const start = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    prevRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}
