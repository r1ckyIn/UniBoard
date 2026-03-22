"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import TokenInput from "./TokenInput";
import {
  validateCanvasToken,
  validateEdToken,
} from "@/lib/validation/token";

interface TokenStepProps {
  onBack: () => void;
  onSuccess: () => void;
}

/**
 * Step 3 of the setup flow: Token paste, sequential validation, security note.
 * Validates Canvas token first; if it fails, Ed is not validated (CONTEXT.md locked decision).
 * 0.8s delay between Canvas and Ed validation for visual feedback.
 */
export default function TokenStep({ onBack, onSuccess }: TokenStepProps) {
  const t = useTranslations("setup.tokens");

  const [canvasValue, setCanvasValue] = useState("");
  const [edValue, setEdValue] = useState("");
  const [canvasStatus, setCanvasStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [edStatus, setEdStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [canvasError, setCanvasError] = useState<string | undefined>(undefined);
  const [edError, setEdError] = useState<string | undefined>(undefined);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    // Reset statuses
    setCanvasStatus("idle");
    setEdStatus("idle");
    setCanvasError(undefined);
    setEdError(undefined);

    // Canvas first
    const canvasValid = validateCanvasToken(canvasValue);
    setCanvasStatus(canvasValid ? "valid" : "invalid");
    if (!canvasValid) {
      setCanvasError(t("errors.canvas"));
      setValidating(false);
      return; // STOP -- don't validate Ed (CONTEXT.md locked decision)
    }

    // Wait 0.8s (CONTEXT.md locked decision)
    await new Promise((r) => setTimeout(r, 800));

    // Ed validation
    const edValid = validateEdToken(edValue);
    setEdStatus(edValid ? "valid" : "invalid");
    if (!edValid) {
      setEdError(t("errors.ed"));
      setValidating(false);
      return;
    }

    // Both valid -- wait 0.5s then success
    await new Promise((r) => setTimeout(r, 500));
    setValidating(false);
    onSuccess();
  };

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

      {/* Canvas token input */}
      <div className="mb-5">
        <TokenInput
          platform="canvas"
          value={canvasValue}
          onChange={setCanvasValue}
          status={canvasStatus}
          error={canvasError}
        />
      </div>

      {/* Ed token input */}
      <div className="mb-6">
        <TokenInput
          platform="ed"
          value={edValue}
          onChange={setEdValue}
          status={edStatus}
          error={edError}
        />
      </div>

      {/* Security note */}
      <div className="flex gap-3 p-4 rounded-lg bg-[rgba(120,140,93,.04)] border border-[rgba(120,140,93,.12)]">
        <Shield size={16} className="text-[#788c5d] mt-0.5 flex-shrink-0" />
        <p className="text-base text-text-2 leading-[1.6]">
          <span className="font-semibold text-text-1">{t("security.title")}</span>{" "}
          {t("security.description")}
        </p>
      </div>

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

        {/* Validate & Connect button */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={validating}
          className={
            validating
              ? "bg-[#d97757] text-white font-semibold py-3 px-7 rounded-lg opacity-60 cursor-default"
              : "bg-[#d97757] hover:bg-[#c5674a] text-white font-semibold py-3 px-7 rounded-lg transition-all duration-150 ease-in-out hover:-translate-y-px"
          }
        >
          {validating ? t("validating") : t("cta")}
        </button>
      </div>
    </div>
  );
}
