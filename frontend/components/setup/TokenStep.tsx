"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Shield } from "lucide-react";
import TokenInput from "./TokenInput";
import {
  validateCanvasToken,
  validateEdToken,
} from "@/lib/validations/token";

interface TokenStepProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function TokenStep({ onBack, onSuccess }: TokenStepProps) {
  const t = useTranslations("setup.tokens");
  const abortRef = useRef(false);

  const [canvasValue, setCanvasValue] = useState("");
  const [edValue, setEdValue] = useState("");
  const [canvasStatus, setCanvasStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [edStatus, setEdStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [canvasError, setCanvasError] = useState<string>();
  const [edError, setEdError] = useState<string>();
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    abortRef.current = false;
    setValidating(true);
    setCanvasStatus("idle");
    setEdStatus("idle");
    setCanvasError(undefined);
    setEdError(undefined);

    const canvasValid = validateCanvasToken(canvasValue);
    setCanvasStatus(canvasValid ? "valid" : "invalid");
    if (!canvasValid) {
      setCanvasError(t("errors.canvas"));
      setValidating(false);
      return;
    }

    // Sequential validation: Canvas must pass before Ed is checked
    await new Promise((r) => setTimeout(r, 800));
    if (abortRef.current) return;

    const edValid = validateEdToken(edValue);
    setEdStatus(edValid ? "valid" : "invalid");
    if (!edValid) {
      setEdError(t("errors.ed"));
      setValidating(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 500));
    if (abortRef.current) return;

    setValidating(false);
    onSuccess();
  };

  // Abort in-flight validation if user navigates away
  const handleBack = () => {
    abortRef.current = true;
    setValidating(false);
    onBack();
  };

  return (
    <div>
      <h2 className="text-[21px] font-serif font-semibold text-text-1 text-center">
        {t("title")}
      </h2>

      <p className="text-base text-text-2 leading-[1.6] text-center mt-2 mb-6">
        {t("description")}
      </p>

      <div className="mb-5">
        <TokenInput
          platform="canvas"
          value={canvasValue}
          onChange={setCanvasValue}
          status={canvasStatus}
          error={canvasError}
          onClear={() => { setCanvasValue(""); setCanvasStatus("idle"); setCanvasError(undefined); }}
        />
      </div>

      <div className="mb-6">
        <TokenInput
          platform="ed"
          value={edValue}
          onChange={setEdValue}
          status={edStatus}
          error={edError}
          onClear={() => { setEdValue(""); setEdStatus("idle"); setEdError(undefined); }}
        />
      </div>

      <div className="flex gap-3 p-4 rounded-lg bg-[rgba(120,140,93,.04)] border border-[rgba(120,140,93,.12)]">
        <Shield size={16} className="text-[#788c5d] mt-0.5 flex-shrink-0" />
        <p className="text-base text-text-2 leading-[1.6]">
          <span className="font-semibold text-text-1">{t("security.title")}</span>{" "}
          {t("security.description")}
        </p>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          type="button"
          onClick={handleBack}
          className="bg-transparent border-[1.5px] border-card-border text-text-2 font-semibold py-3 px-6 rounded-lg hover:bg-card-bg-hover hover:text-text-1 transition-all duration-150 ease-in-out"
        >
          {t("back")}
        </button>

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
