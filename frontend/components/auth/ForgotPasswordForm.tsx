"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useResetPassword } from "@/hooks/use-auth";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .refine((e) => e.endsWith("@uni.sydney.edu.au"), {
      message: "Please use your USYD student email (@uni.sydney.edu.au)",
    }),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

// Cooldown duration in milliseconds. Kept client-only; Supabase enforces
// server-side rate-limiting separately (max_frequency = "1s").
const COOLDOWN_MS = 60_000;

export default function ForgotPasswordForm({
  onSwitchToLogin,
}: ForgotPasswordFormProps) {
  const t = useTranslations();
  const resetMutation = useResetPassword();
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string>("");

  // Cooldown state: end timestamp (ms epoch) + ticker
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [tick, setTick] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!cooldownEnd) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownEnd]);

  const remainingMs = cooldownEnd ? Math.max(0, cooldownEnd - tick) : 0;
  const inCooldown = remainingMs > 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onSubmit",
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    resetMutation.mutate(data.email, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
        setSent(true);
        // Start initial cooldown immediately on first success.
        setCooldownEnd(Date.now() + COOLDOWN_MS);
        setTick(Date.now());
      },
    });
  };

  const handleResend = () => {
    if (inCooldown || !submittedEmail || resetMutation.isPending) return;
    resetMutation.mutate(submittedEmail, {
      onSuccess: () => {
        setCooldownEnd(Date.now() + COOLDOWN_MS);
        setTick(Date.now());
        toast.success(t("auth.forgotPassword.resendSuccess"));
      },
      onError: (err) => {
        const message =
          err instanceof Error
            ? err.message
            : t("auth.forgotPassword.resendFailed");
        toast.error(message);
        // Do NOT restart cooldown on failure -- allow immediate retry.
      },
    });
  };

  const inputBaseClass =
    "w-full px-3.5 py-2.5 text-[0.84rem] border-[1.5px] border-card-border rounded-lg bg-cream text-text-1 outline-none transition-[border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] placeholder:text-text-3 focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,0.11)]";
  const inputErrorClass = "border-[#cc4455]";

  // Success state: show check-email UI with resend button + cooldown
  if (sent) {
    const resendLabel = inCooldown
      ? t("auth.forgotPassword.resendCooldown", {
          seconds: String(remainingSec).padStart(2, "0"),
        })
      : t("auth.forgotPassword.resend");

    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-[rgba(120,140,93,0.11)] grid place-items-center text-[#788c5d] mb-4">
          <Mail size={28} />
        </div>
        <h2 className="font-serif text-[1.3rem] font-semibold mb-2">
          {t("auth.forgotPassword.successTitle")}
        </h2>
        <p className="text-[0.84rem] text-text-2 mb-5 leading-[1.6] max-w-[280px]">
          {t("auth.forgotPassword.successMessage")}
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[0.84rem] text-[#d97757] font-semibold hover:opacity-80 transition-opacity"
        >
          {t("auth.forgotPassword.backToLogin")}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={inCooldown || resetMutation.isPending}
          className="mt-3 text-[0.84rem] font-medium text-[#d97757] hover:underline disabled:text-text-3 disabled:no-underline disabled:cursor-default"
        >
          {resendLabel}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <h1 className="font-serif text-[1.6rem] font-semibold mb-1.5">
        {t("auth.forgotPassword.title")}
      </h1>
      <p className="text-[0.84rem] text-text-2 mb-6">
        {t("auth.forgotPassword.subtitle")}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* Email field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.forgotPassword.emailLabel")}
          </label>
          <input
            type="email"
            placeholder={t("auth.forgotPassword.emailPlaceholder")}
            className={`${inputBaseClass} ${errors.email ? inputErrorClass : ""}`}
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* API error */}
        {resetMutation.isError && (
          <p className="text-[0.72rem] text-[#cc4455]">
            {t("auth.errors.resetFailed")}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={resetMutation.isPending}
          className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
        >
          {resetMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            t("auth.forgotPassword.submitButton")
          )}
        </button>
      </form>

      {/* Back to login link */}
      <div className="text-center mt-5">
        <button
          type="button"
          className="text-[0.82rem] text-[#d97757] font-semibold hover:opacity-80 transition-opacity"
          onClick={onSwitchToLogin}
        >
          {t("auth.forgotPassword.backToLogin")}
        </button>
      </div>
    </div>
  );
}
