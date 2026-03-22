"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import RoughCard from "@/components/design-system/RoughCard";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import StepIndicator from "./StepIndicator";
import WelcomeStep from "./WelcomeStep";
import TutorialStep from "./TutorialStep";
import TokenStep from "./TokenStep";
import SuccessStep from "./SuccessStep";

const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Top-level setup page orchestrator: manages step state (1/2/3/success),
 * renders StepIndicator + step content inside RoughCard with AnimatePresence
 * crossfade transitions.
 */
export default function SetupPage() {
  const [step, setStep] = useState<1 | 2 | 3 | "success">(1);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 px-5">
      <AnimatedEntry delay={1}>
        <StepIndicator currentStep={step} />
      </AnimatedEntry>

      <AnimatedEntry delay={2}>
        <div className="max-w-[640px] w-full">
          <RoughCard
            disableHover={true}
            padding="py-10 px-9 max-[680px]:py-7 max-[680px]:px-5"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.3 },
                  layout: { duration: 0.4, ease: EASE_OUT },
                }}
              >
                {step === 1 && (
                  <WelcomeStep onNext={() => setStep(2)} />
                )}
                {step === 2 && (
                  <TutorialStep
                    onNext={() => setStep(3)}
                    onBack={() => setStep(1)}
                  />
                )}
                {step === 3 && (
                  <TokenStep
                    onBack={() => setStep(2)}
                    onSuccess={() => setStep("success")}
                  />
                )}
                {step === "success" && <SuccessStep />}
              </motion.div>
            </AnimatePresence>
          </RoughCard>
        </div>
      </AnimatedEntry>
    </div>
  );
}
