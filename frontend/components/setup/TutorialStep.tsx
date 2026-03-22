"use client";

import { useTranslations } from "next-intl";
import GuideCard from "@/components/setup/GuideCard";

interface TutorialStepProps {
  onNext: () => void;
  onBack: () => void;
}

/**
 * Step 2 of the setup flow: Tutorial showing how to get Canvas and Ed API tokens.
 * Renders two independently collapsible GuideCards, both default expanded.
 */
export default function TutorialStep({ onNext, onBack }: TutorialStepProps) {
  const t = useTranslations("setup.tutorial");

  return (
    <div>
      {/* Title */}
      <h2 className="text-[21px] font-serif font-semibold text-text-1 text-center">
        {t("title")}
      </h2>

      {/* Description */}
      <p className="text-base text-text-2 leading-[1.6] text-center mt-2 mb-6">
        {t("description")}
      </p>

      {/* Guide cards */}
      <GuideCard platform="canvas" defaultExpanded={true} />
      <div className="mt-4" />
      <GuideCard platform="ed" defaultExpanded={true} />

      {/* Button row */}
      <div className="flex items-center justify-between mt-8">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="bg-transparent border-[1.5px] border-card-border text-text-2 font-semibold py-3 px-6 rounded-lg hover:bg-card-bg-hover hover:text-text-1 transition-all duration-150 ease-in-out"
        >
          {t("back")}
        </button>

        {/* "I have my tokens" button */}
        <button
          type="button"
          onClick={onNext}
          className="bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-7 rounded-lg transition-all duration-150 ease-in-out hover:-translate-y-px"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}
