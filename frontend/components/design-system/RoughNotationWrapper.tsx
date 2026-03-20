"use client";

import { useRef, useEffect, useCallback } from "react";
import { annotate } from "rough-notation";
import type { RoughAnnotation, RoughAnnotationType } from "rough-notation/lib/model.js";

interface RoughNotationWrapperProps {
  children: React.ReactNode;
  type: "underline" | "circle" | "highlight" | "box" | "strike-through";
  color: string;
  strokeWidth?: number;
  padding?: number;
  animationDuration?: number;
  show?: boolean;
  delay?: number;
}

export default function RoughNotationWrapper({
  children,
  type,
  color,
  strokeWidth = 2,
  padding = 2,
  animationDuration = 600,
  show = true,
  delay = 0,
}: RoughNotationWrapperProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const annotationRef = useRef<RoughAnnotation | null>(null);

  const updateAnnotation = useCallback(() => {
    if (!spanRef.current) return;

    // Remove existing annotation if present
    if (annotationRef.current) {
      annotationRef.current.remove();
      annotationRef.current = null;
    }

    const annotation = annotate(spanRef.current, {
      type: type as RoughAnnotationType,
      color,
      strokeWidth,
      padding,
      animationDuration,
    });
    annotationRef.current = annotation;

    if (show) {
      if (delay > 0) {
        const timer = setTimeout(() => {
          annotation.show();
        }, delay);
        return () => clearTimeout(timer);
      } else {
        annotation.show();
      }
    }
  }, [type, color, strokeWidth, padding, animationDuration, show, delay]);

  useEffect(() => {
    const cleanup = updateAnnotation();

    return () => {
      if (cleanup) cleanup();
      if (annotationRef.current) {
        annotationRef.current.remove();
        annotationRef.current = null;
      }
    };
  }, [updateAnnotation]);

  return <span ref={spanRef}>{children}</span>;
}
