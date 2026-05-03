"use client";

// Phase 40 plan-01 (D-40-01 + D-40-02 + D-40-12): cva-based Input primitive.
// 2 variants (default/search) + error + leftIcon/rightIcon slots. Variants
// bind to Phase 39 design tokens (cream bg, card-border, orange focus,
// red error). Uses Phase 40 transition-claude-fast @utility shorthand.
//
// Source: RESEARCH Pattern 2. Closest existing analog: components/deadlines/
// DeadlineAiChat.tsx lines 119-129 (PATTERNS Excerpt C — input with icons).

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const inputVariants = cva(
  [
    "w-full text-[0.84rem]",
    "bg-cream text-text-1",
    "border-[1.5px] border-card-border",
    "outline-none",
    // Phase 40 SEED-40 shorthand — minor semantic widening from
    // border+shadow-only to all properties is acceptable for a
    // focus-styled input; matches plan-01 sweep philosophy.
    "transition-claude-fast",
    "placeholder:text-text-3",
    "focus:border-orange focus:shadow-[0_0_0_3px_var(--color-orange-soft)]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      variant: {
        default: "rounded-lg px-3.5 py-2.5",
        search: "rounded-full px-[20px] py-[10px]",
      },
      error: {
        true: "border-red focus:border-red focus:shadow-[0_0_0_3px_var(--color-red-soft)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, error, leftIcon, rightIcon, ...props }, ref) => {
    if (!leftIcon && !rightIcon) {
      return (
        <input
          ref={ref}
          className={cn(inputVariants({ variant, error }), className)}
          {...props}
        />
      );
    }
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            inputVariants({ variant, error }),
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3">
            {rightIcon}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { inputVariants };
