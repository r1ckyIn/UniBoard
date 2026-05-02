"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | "success";
}

const STEPS = [1, 2, 3] as const;

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const stepNum = currentStep === "success" ? 4 : currentStep;
  const isSuccess = currentStep === "success";

  return (
    <div
      className="flex items-center justify-center mb-8"
      role="group"
      aria-label="Setup progress"
    >
      {STEPS.map((step, index) => {
        const isCompleted = step < stepNum || isSuccess;
        const isActive = step === stepNum && !isSuccess;

        return (
          <Fragment key={step}>
            {index > 0 && (
              <div
                data-testid={`step-line-${index}`}
                className={cn(
                  "w-12 h-0.5 mx-2 transition-[background] [transition-duration:var(--motion-base)] [transition-timing-function:var(--ease-claude-out)]",
                  step <= stepNum || isSuccess
                    ? "bg-[#788c5d]"
                    : "bg-card-border",
                )}
              />
            )}

            <div
              aria-label={`Step ${step}`}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-claude-base",
                isCompleted && "bg-[#788c5d] text-white",
                isActive && "bg-[#d97757] text-white",
                !isCompleted &&
                  !isActive &&
                  "border-2 border-card-border text-text-3",
              )}
            >
              {isCompleted ? <Check size={16} /> : step}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
