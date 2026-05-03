"use client";

// Phase 40 plan-01 (D-40-01 + D-40-02 + D-40-12): cva-based Button primitive.
// 4 variants × 2 sizes + iconOnly + loading. Variants bind to Phase 39 design
// tokens (orange/red/cream/card-border colors, --motion-fast via the @utility
// shorthand transition-claude-fast added in plan-01 Task 0).
//
// Source: cva.style/docs/getting-started/typescript + RESEARCH Pattern 1.
// Closest existing analog: components/shared/FeedbackButton.tsx
// (PATTERNS Excerpt B — typed-prop button shape with conditional className).

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  // Base — applies to all variants; consumes Phase 40 @utility shorthand
  // and Phase 41 A11Y-01 focus ring groundwork.
  [
    "inline-flex items-center justify-center",
    "font-semibold rounded-[8px]",
    "cursor-pointer transition-claude-fast",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-orange/40 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        // Primary — orange filled, white text; v2.0 #d97757 / #c5674a.
        primary: [
          "bg-orange text-white border-none",
          "hover:bg-[#c5674a]",
          "hover:-translate-y-px active:translate-y-0",
        ],
        // Secondary — cream outline; v2.0 button cancel pattern.
        secondary: [
          "bg-cream text-text-2 border border-card-border",
          "hover:bg-card-bg-hover",
        ],
        // Ghost — no background; transparent until hover.
        ghost: [
          "bg-transparent text-text-2 border-none",
          "hover:bg-card-bg-hover",
        ],
        // Danger — red destructive action; v2.0 #cc4455 / #b33d4c.
        danger: [
          "bg-red text-white border-none",
          "hover:bg-[#b33d4c]",
        ],
      },
      size: {
        sm: "h-[32px] px-[12px] text-[0.76rem]",
        md: "h-[44px] px-[24px] text-[0.86rem]",
      },
      iconOnly: {
        true: "aspect-square px-0",
      },
      loading: {
        true: "pointer-events-none opacity-80",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      iconOnly,
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant, size, iconOnly, loading }),
        className,
      )}
      disabled={disabled || loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
