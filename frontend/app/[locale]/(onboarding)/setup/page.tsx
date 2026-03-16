"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useSetToken } from "@/lib/hooks/useUser";
import { useTriggerSync } from "@/lib/hooks/useSync";
import StepIndicator from "@/components/onboarding/StepIndicator";
import TokenGuide from "@/components/onboarding/TokenGuide";
import RoughCard from "@/components/design-system/RoughCard";
import { CheckCircle, XCircle } from "lucide-react";

/**
 * 3-step onboarding flow (single page, step state managed locally):
 *  1. Welcome
 *  2. Token tutorial (how to get Canvas + Ed tokens)
 *  3. Paste tokens and validate
 */
export default function OnboardingSetupPage() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [canvasToken, setCanvasToken] = useState("");
  const [edToken, setEdToken] = useState("");
  const [canvasStatus, setCanvasStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [edStatus, setEdStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const setCanvasTokenMut = useSetToken("canvas");
  const setEdTokenMut = useSetToken("ed");
  const triggerSync = useTriggerSync();

  async function handleValidateAndConnect(e: FormEvent) {
    e.preventDefault();
    setIsValidating(true);
    setError("");
    setCanvasStatus("idle");
    setEdStatus("idle");

    try {
      // Validate Canvas token
      try {
        await setCanvasTokenMut.mutateAsync({ token: canvasToken });
        setCanvasStatus("valid");
      } catch {
        setCanvasStatus("invalid");
        setIsValidating(false);
        return;
      }

      // Validate Ed token
      try {
        await setEdTokenMut.mutateAsync({ token: edToken });
        setEdStatus("valid");
      } catch {
        setEdStatus("invalid");
        setIsValidating(false);
        return;
      }

      // Both valid: trigger first sync
      try {
        await triggerSync.mutateAsync();
      } catch {
        // Sync trigger failure is non-blocking
      }

      // Redirect to dashboard
      router.push(`/${locale}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <div>
      <StepIndicator total={3} current={step} />

      <RoughCard className="rounded-[14px]">
        <div
          className="p-8"
          style={{
            background: "var(--color-card-bg)",
            borderRadius: "var(--radius-card)",
          }}
        >
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div
                className="mx-auto mb-4 grid place-items-center"
                style={{
                  width: 56,
                  height: 56,
                  background: "var(--color-orange)",
                  borderRadius: 14,
                  fontFamily: "var(--font-serif)",
                  fontWeight: 700,
                  fontSize: 28,
                  color: "#fff",
                }}
              >
                U
              </div>
              <h1
                className="text-2xl mb-3"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("step1Title")}
              </h1>
              <p
                className="text-sm mb-8 max-w-md mx-auto"
                style={{ color: "var(--color-text-2)", lineHeight: 1.7 }}
              >
                {t("step1Desc")}
              </p>
              <button
                onClick={() => setStep(2)}
                className="px-8 py-2.5 text-sm font-medium text-white rounded-[8px] cursor-pointer"
                style={{ background: "var(--color-orange)" }}
              >
                {t("next")}
              </button>
            </div>
          )}

          {/* Step 2: Token Tutorial */}
          {step === 2 && (
            <div>
              <h1
                className="text-2xl mb-2 text-center"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("step2Title")}
              </h1>
              <p
                className="text-sm mb-6 text-center"
                style={{ color: "var(--color-text-2)" }}
              >
                {t("step2Desc")}
              </p>

              <div className="flex flex-col gap-4">
                <TokenGuide platform="canvas" />
                <TokenGuide platform="ed" />
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 text-sm font-medium rounded-[8px] cursor-pointer"
                  style={{
                    color: "var(--color-text-2)",
                    border: "1px solid var(--color-card-border)",
                    background: "transparent",
                  }}
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-8 py-2.5 text-sm font-medium text-white rounded-[8px] cursor-pointer"
                  style={{ background: "var(--color-orange)" }}
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Paste Tokens */}
          {step === 3 && (
            <form onSubmit={handleValidateAndConnect}>
              <h1
                className="text-2xl mb-2 text-center"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {t("step3Title")}
              </h1>
              <p
                className="text-sm mb-6 text-center"
                style={{ color: "var(--color-text-2)" }}
              >
                {t("step3Desc")}
              </p>

              <div className="flex flex-col gap-4">
                {/* Canvas token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-text-2)" }}>
                    {t("canvasToken")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={canvasToken}
                      onChange={(e) => { setCanvasToken(e.target.value); setCanvasStatus("idle"); }}
                      required
                      className="flex-1 px-3 py-2.5 text-sm rounded-[8px] outline-none"
                      style={{
                        fontFamily: "monospace",
                        border: `1px solid ${canvasStatus === "invalid" ? "#c44" : "var(--color-card-border)"}`,
                        background: "var(--color-cream)",
                        color: "var(--color-text-1)",
                      }}
                    />
                    {canvasStatus === "valid" && <CheckCircle size={20} style={{ color: "var(--color-green)" }} />}
                    {canvasStatus === "invalid" && <XCircle size={20} style={{ color: "#c44" }} />}
                  </div>
                  {canvasStatus === "invalid" && (
                    <p className="text-xs" style={{ color: "#c44" }}>{t("tokenInvalid")}</p>
                  )}
                </div>

                {/* Ed token */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--color-text-2)" }}>
                    {t("edToken")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={edToken}
                      onChange={(e) => { setEdToken(e.target.value); setEdStatus("idle"); }}
                      required
                      className="flex-1 px-3 py-2.5 text-sm rounded-[8px] outline-none"
                      style={{
                        fontFamily: "monospace",
                        border: `1px solid ${edStatus === "invalid" ? "#c44" : "var(--color-card-border)"}`,
                        background: "var(--color-cream)",
                        color: "var(--color-text-1)",
                      }}
                    />
                    {edStatus === "valid" && <CheckCircle size={20} style={{ color: "var(--color-green)" }} />}
                    {edStatus === "invalid" && <XCircle size={20} style={{ color: "#c44" }} />}
                  </div>
                  {edStatus === "invalid" && (
                    <p className="text-xs" style={{ color: "#c44" }}>{t("tokenInvalid")}</p>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-sm mt-3" style={{ color: "#c44" }}>{error}</p>
              )}

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 text-sm font-medium rounded-[8px] cursor-pointer"
                  style={{
                    color: "var(--color-text-2)",
                    border: "1px solid var(--color-card-border)",
                    background: "transparent",
                  }}
                >
                  {t("back")}
                </button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="px-8 py-2.5 text-sm font-medium text-white rounded-[8px] cursor-pointer disabled:opacity-60"
                  style={{ background: "var(--color-orange)" }}
                >
                  {isValidating ? t("validating") : t("validate")}
                </button>
              </div>
            </form>
          )}
        </div>
      </RoughCard>
    </div>
  );
}
