"use client";

import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";

interface AiChatPlaceholderProps {
  courseCode: string;
}

/**
 * Disabled AI chat input with "Coming Soon" badge overlay.
 * Renders a non-functional input + send button to preview
 * the future AI tutoring feature.
 */
export default function AiChatPlaceholder({
  courseCode,
}: AiChatPlaceholderProps) {
  const t = useTranslations("courseDetail");

  return (
    <div className="mt-[8px] px-[2px]">
      {/* Title */}
      <div className="font-serif italic text-[0.88rem] font-semibold text-[#6b6b65] mb-[10px]">
        {t("aiChat.title")}
      </div>

      {/* Input row with Coming Soon overlay */}
      <div className="relative">
        {/* Coming Soon badge centered above */}
        <div className="flex justify-center mb-[8px]">
          <span className="text-[0.72rem] font-semibold bg-[rgba(217,119,87,0.11)] text-[#d97757] rounded px-[12px] py-[4px]">
            {t("aiChat.comingSoon")}
          </span>
        </div>

        <div className="flex items-center gap-[10px]">
          <input
            type="text"
            disabled
            className="flex-1 border-[1.5px] border-[#e8e5dd] rounded-full bg-[#f6f5f0] px-[20px] py-[12px] text-[0.84rem] text-[#2d2d2a] outline-none opacity-50 cursor-not-allowed"
            placeholder={t("aiChat.placeholder", { courseCode })}
          />
          <button
            disabled
            className="w-[40px] h-[40px] rounded-full bg-[#d97757] text-white grid place-items-center flex-shrink-0 opacity-50 cursor-not-allowed"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[0.66rem] text-[#9b9b94] mt-[8px] text-center italic">
        {t("aiChat.disclaimer")}
      </p>
    </div>
  );
}
