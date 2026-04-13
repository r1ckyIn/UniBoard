"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import {
  registerSchema,
  type RegisterInput,
  getPasswordStrength,
} from "@/lib/validations/auth";
import { useRegister } from "@/hooks/use-auth";
import PasswordStrengthMeter from "./PasswordStrengthMeter";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegisterSuccess?: () => void;
}

export default function RegisterForm({
  onSwitchToLogin,
}: RegisterFormProps) {
  const t = useTranslations();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue || "");

  const onSubmit = (data: RegisterInput) => {
    registerMutation.mutate(
      {
        email: data.email,
        password: data.password,
        display_name: data.displayName,
      },
      {
        onSuccess: () => {
          // Email confirmation enabled -- show check-email UI instead of auto-redirect
          setEmailSent(true);
        },
      },
    );
  };

  const isPending = registerMutation.isPending;

  const inputBaseClass =
    "w-full px-3.5 py-2.5 text-[0.84rem] border-[1.5px] border-card-border rounded-lg bg-cream text-text-1 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-text-3 focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,0.11)]";
  const inputErrorClass = "border-[#cc4455]";

  // Check-email success state after registration
  if (emailSent) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-14 h-14 rounded-full bg-[rgba(120,140,93,0.11)] grid place-items-center text-[#788c5d] mb-4">
          <Mail size={28} />
        </div>
        <h2 className="font-serif text-[1.3rem] font-semibold mb-2">
          {t("auth.checkEmail.title")}
        </h2>
        <p className="text-[0.84rem] text-text-2 mb-5 leading-[1.6] max-w-[280px]">
          {t("auth.checkEmail.description")}
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[0.84rem] text-[#d97757] font-semibold hover:opacity-80 transition-opacity"
        >
          {t("auth.checkEmail.backToLogin")}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Title */}
      <h1 className="font-serif text-[1.6rem] font-semibold mb-1.5">
        {t("auth.register.title")}
      </h1>
      <p className="text-[0.84rem] text-text-2 mb-6">
        {t("auth.register.subtitle")}
      </p>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.register.displayNameLabel")}
          </label>
          <input
            type="text"
            placeholder={t("auth.register.displayNamePlaceholder")}
            className={`${inputBaseClass} ${errors.displayName ? inputErrorClass : ""}`}
            {...register("displayName")}
          />
          {errors.displayName?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.register.emailLabel")}
          </label>
          <input
            type="email"
            placeholder={t("auth.register.emailPlaceholder")}
            className={`${inputBaseClass} ${errors.email ? inputErrorClass : ""}`}
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.register.passwordLabel")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.register.passwordPlaceholder")}
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
            {t("auth.register.confirmPasswordLabel")}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
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
        {registerMutation.isError && (
          <p className="text-[0.72rem] text-[#cc4455]">
            {t("auth.errors.registerFailed")}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] duration-150"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            t("auth.register.submitButton")
          )}
        </button>
      </form>

      {/* Bottom link */}
      <div className="text-center mt-5 text-[0.82rem] text-text-3">
        {t("auth.register.hasAccount")}{" "}
        <button
          type="button"
          className="text-[#d97757] font-semibold hover:opacity-80 transition-opacity"
          onClick={onSwitchToLogin}
        >
          {t("auth.register.signIn")}
        </button>
      </div>
    </div>
  );
}
