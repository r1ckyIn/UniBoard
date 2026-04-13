"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { getPasswordStrength } from "@/lib/validations/auth";
import { useUpdatePassword } from "@/hooks/use-auth";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

interface UpdatePasswordFormProps {
  onSwitchToLogin: () => void;
}

export default function UpdatePasswordForm({
  onSwitchToLogin,
}: UpdatePasswordFormProps) {
  const t = useTranslations();
  const updateMutation = useUpdatePassword();
  const [updated, setUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onSubmit",
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue || "");

  const onSubmit = (data: UpdatePasswordInput) => {
    updateMutation.mutate(data.password, {
      onSuccess: () => {
        setUpdated(true);
      },
    });
  };

  const inputBaseClass =
    "w-full px-3.5 py-2.5 text-[0.84rem] border-[1.5px] border-card-border rounded-lg bg-cream text-text-1 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-3 focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,0.11)]";
  const inputErrorClass = "border-[#cc4455]";

  // Success state: show password updated UI
  if (updated) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-[rgba(120,140,93,0.11)] grid place-items-center text-[#788c5d] mb-4">
          <Check size={28} />
        </div>
        <h2 className="font-serif text-[1.3rem] font-semibold mb-2">
          {t("auth.updatePassword.successTitle")}
        </h2>
        <p className="text-[0.84rem] text-text-2 mb-5 leading-[1.6] max-w-[280px]">
          {t("auth.updatePassword.successMessage")}
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-auto px-8 h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 transition-[background,transform] duration-150"
        >
          {t("auth.updatePassword.backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <h1 className="font-serif text-[1.6rem] font-semibold mb-1.5">
        {t("auth.updatePassword.title")}
      </h1>
      <p className="text-[0.84rem] text-text-2 mb-6">
        {t("auth.updatePassword.subtitle")}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.updatePassword.passwordLabel")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.updatePassword.passwordPlaceholder")}
              className={`${inputBaseClass} pr-10 ${errors.password ? inputErrorClass : ""}`}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <PasswordStrengthMeter strength={strength} />
          {errors.password?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.updatePassword.confirmLabel")}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.updatePassword.confirmPlaceholder")}
              className={`${inputBaseClass} pr-10 ${errors.confirmPassword ? inputErrorClass : ""}`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* API error */}
        {updateMutation.isError && (
          <p className="text-[0.72rem] text-[#cc4455]">
            {t("auth.errors.updatePasswordFailed")}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] duration-150"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            t("auth.updatePassword.submitButton")
          )}
        </button>
      </form>
    </div>
  );
}
