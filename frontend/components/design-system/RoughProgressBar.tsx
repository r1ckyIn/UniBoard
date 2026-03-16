"use client";

import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import clsx from "clsx";

interface RoughProgressBarProps {
  /** Progress value from 0 to 100. */
  value: number;
  /** Fill color (default: --color-orange). */
  color?: string;
  className?: string;
}

/**
 * Canvas-based hand-drawn progress bar using Rough.js.
 */
function RoughProgressBarInner({
  value,
  color = "#d97757",
  className,
}: RoughProgressBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const rc = rough.canvas(canvas);

    // Background track
    rc.rectangle(0, 0, w, h, {
      stroke: "#e8e5dd",
      strokeWidth: 0.5,
      roughness: 0.8,
      fill: "#f6f5f0",
      fillStyle: "solid",
    });

    // Filled portion
    const filledWidth = Math.max(0, Math.min(100, value)) * (w / 100);
    if (filledWidth > 2) {
      rc.rectangle(0, 0, filledWidth, h, {
        stroke: color,
        strokeWidth: 0.5,
        roughness: 0.8,
        fill: color,
        fillStyle: "solid",
      });
    }
  }, [value, color]);

  useEffect(() => {
    requestAnimationFrame(draw);
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return (
    <div className={clsx("relative h-3 w-full", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export default RoughProgressBarInner;
