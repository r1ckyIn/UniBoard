"use client";

import { type ReactNode } from "react";
import {
  RoughNotation,
  RoughNotationGroup,
} from "react-rough-notation";

type AnnotationType =
  | "underline"
  | "circle"
  | "highlight"
  | "box"
  | "bracket"
  | "strike-through"
  | "crossed-off";

interface RoughNotationWrapperProps {
  children: ReactNode;
  type: AnnotationType;
  color: string;
  /** Animation order within a group (lower = earlier). */
  order?: number;
  show?: boolean;
}

/**
 * Wraps react-rough-notation to provide a declarative JSX API
 * with staggered auto-play via RoughNotationGroup.
 */
export function RoughNotationItem({
  children,
  type,
  color,
  order = 1,
  show = true,
}: RoughNotationWrapperProps) {
  return (
    <RoughNotation type={type} color={color} order={order} show={show}>
      {children}
    </RoughNotation>
  );
}

/**
 * Group wrapper that plays annotations in sequence on mount.
 */
export function RoughNotationSequence({
  children,
  show = true,
}: {
  children: ReactNode;
  show?: boolean;
}) {
  return (
    <RoughNotationGroup show={show}>{children}</RoughNotationGroup>
  );
}
