"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import RoughCard from "@/components/design-system/RoughCard";
import AnimatedEntry from "@/components/shared/AnimatedEntry";
import StepIndicator from "./StepIndicator";
import WelcomeStep from "./WelcomeStep";
import TutorialStep from "./TutorialStep";
import TokenStep from "./TokenStep";
import SuccessStep from "./SuccessStep";

const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

type StepValue = 1 | 2 | 3 | "success";

/**
 * Parse step value from URL search param string.
 * Valid: "1", "2", "3", "success". Anything else defaults to 1.
 */
function parseStep(raw: string | null): StepValue {
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  if (raw === "success") return "success";
  return 1;
}

/**
 * Top-level setup page orchestrator: manages step state (1/2/3/success),
 * renders StepIndicator + step content inside RoughCard with AnimatePresence
 * crossfade transitions. Step is persisted in URL ?step=N so language
 * switches (which remount this component) preserve the current step.
 */
export default function SetupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [step, setStep] = useState<StepValue>(() =>
    parseStep(searchParams.get("step"))
  );

  // Update both React state and URL search param
  const setStepWithUrl = useCallback(
    (newStep: StepValue) => {
      setStep(newStep);
      router.replace(`${pathname}?step=${newStep}`, { scroll: false });
    },
    [router, pathname]
  );

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
                  <WelcomeStep onNext={() => setStepWithUrl(2)} />
                )}
                {step === 2 && (
                  <TutorialStep
                    onNext={() => setStepWithUrl(3)}
                    onBack={() => setStepWithUrl(1)}
                  />
                )}
                {step === 3 && (
                  <TokenStep
                    onBack={() => setStepWithUrl(2)}
                    onSuccess={() => setStepWithUrl("success")}
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
