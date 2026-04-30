"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useLogin, useGoogleLogin } from "@/hooks/use-auth";
import { restoreTokenConfiguredIfNeeded } from "@/lib/auth/restore-token-status";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSwitchToForgotPassword: () => void;
}

export default function LoginForm({
  onSwitchToRegister,
  onSwitchToForgotPassword,
}: LoginFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const loginMutation = useLogin();
  const googleLogin = useGoogleLogin();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (googleLogin.error) {
      toast.error(t("auth.google.errorGeneric"));
    }
  }, [googleLogin.error, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
  });

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: async () => {
          const configured = await restoreTokenConfiguredIfNeeded();
          router.replace(configured ? `/${locale}` : `/${locale}/setup`);
        },
      },
    );
  };

  const inputBaseClass =
    "w-full px-3.5 py-2.5 text-[0.84rem] border-[1.5px] border-card-border rounded-lg bg-cream text-text-1 outline-none transition-[border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] placeholder:text-text-3 focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,0.11)]";
  const inputErrorClass = "border-[#cc4455]";

  return (
    <div>
      {/* Title */}
      <h1 className="font-serif text-[1.6rem] font-semibold mb-1.5">
        {t("auth.login.title")}
      </h1>
      <p className="text-[0.84rem] text-text-2 mb-6">
        {t("auth.login.subtitle")}
      </p>

      {/* Google OAuth button */}
      <button
        type="button"
        onClick={() => googleLogin.mutate()}
        disabled={googleLogin.isPending}
        className="w-full h-[44px] flex items-center justify-center gap-2.5 bg-white border-[1.5px] border-card-border rounded-lg text-text-1 text-[0.86rem] font-semibold hover:bg-cream-2 disabled:opacity-60 transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
        aria-label={t("auth.google.continueWith")}
      >
        <GoogleIcon className="h-4 w-4" aria-hidden />
        {t("auth.google.continueWith")}
      </button>

      {/* "or" divider */}
      <div className="flex items-center gap-3 text-[0.78rem] text-text-3 my-4">
        <div className="h-px flex-1 bg-card-border" />
        <span>{t("auth.google.or")}</span>
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {/* Email field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] font-semibold text-text-2">
            {t("auth.login.emailLabel")}
          </label>
          <input
            type="email"
            placeholder={t("auth.login.emailPlaceholder")}
            className={`${inputBaseClass} ${errors.email ? inputErrorClass : ""}`}
            {...register("email")}
          />
          {errors.email?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[0.8rem] font-semibold text-text-2">
              {t("auth.login.passwordLabel")}
            </label>
            <button
              type="button"
              className="text-[0.72rem] text-[#d97757] font-medium hover:opacity-80 transition-opacity"
              onClick={onSwitchToForgotPassword}
            >
              {t("auth.login.forgotPassword")}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.login.passwordPlaceholder")}
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
          {errors.password?.message && (
            <p className="text-[0.72rem] text-[#cc4455]">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* API error */}
        {loginMutation.isError && (
          <p className="text-[0.72rem] text-[#cc4455]">
            {t("auth.errors.loginFailed")}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full h-[44px] font-semibold text-[0.86rem] text-white bg-[#d97757] rounded-lg hover:bg-[#c5674a] hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:cursor-default disabled:transform-none transition-[background,transform] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"
        >
          {loginMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            t("auth.login.submitButton")
          )}
        </button>
      </form>

      {/* Bottom link */}
      <div className="text-center mt-5 text-[0.82rem] text-text-3">
        {t("auth.login.noAccount")}{" "}
        <button
          type="button"
          className="text-[#d97757] font-semibold hover:opacity-80 transition-opacity"
          onClick={onSwitchToRegister}
        >
          {t("auth.login.createOne")}
        </button>
      </div>
    </div>
  );
}
