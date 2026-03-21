"use client";

import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface SuccessOverlayProps {
  visible: boolean;
  onContinue: () => void;
}

export default function SuccessOverlay({
  visible,
  onContinue,
}: SuccessOverlayProps) {
  const t = useTranslations();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 z-10 bg-card-bg flex flex-col items-center justify-center p-10 text-center rounded-card"
        >
          {/* Green check circle */}
          <div className="w-14 h-14 rounded-full bg-[rgba(120,140,93,0.11)] grid place-items-center text-[#788c5d] mb-4">
            <Check size={28} />
          </div>

          {/* Title */}
          <h2 className="font-serif text-[1.3rem] font-semibold mb-2">
            {t("auth.success.title")}
          </h2>

          {/* Description */}
          <p className="text-[0.84rem] text-text-2 mb-5 leading-[1.6] max-w-[280px]">
            {t("auth.success.description")}
          </p>

          {/* CTA Button */}
          <button
            type="button"
            onClick={onContinue}
            className="w-auto px-8 h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 transition-[background,transform] duration-150"
          >
            {t("auth.success.continueButton")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
