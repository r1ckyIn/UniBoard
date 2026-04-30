"use client";

import { useTranslations } from "next-intl";
import GuideCard from "@/components/setup/GuideCard";

interface TutorialStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function TutorialStep({ onNext, onBack }: TutorialStepProps) {
  const t = useTranslations("setup.tutorial");

  return (
    <div>
      <h2 className="text-[21px] font-serif font-semibold text-text-1 text-center">
        {t("title")}
      </h2>

      <p className="text-base text-text-2 leading-[1.6] text-center mt-2 mb-6">
        {t("description")}
      </p>

      <div className="flex flex-col gap-4">
        <GuideCard platform="canvas" />
        <GuideCard platform="ed" />
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="bg-transparent border-[1.5px] border-card-border text-text-2 font-semibold py-3 px-6 rounded-lg hover:bg-card-bg-hover hover:text-text-1 transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] ease-in-out"
        >
          {t("back")}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-7 rounded-lg transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] ease-in-out hover:-translate-y-px"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}
