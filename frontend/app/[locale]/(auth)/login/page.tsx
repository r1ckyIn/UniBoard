"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useLogin } from "@/lib/hooks/useAuth";
import RoughCard from "@/components/design-system/RoughCard";
import HeroDoodles from "@/components/design-system/HeroDoodles";

/**
 * Login page with split-screen layout.
 * Left: brand showcase. Right: login form.
 * CRITICAL: Login sends form data via URLSearchParams (username=email, password).
 */
export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await login.mutateAsync({ email, password });
      router.push(`/${locale}`);
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  }

  return (
    <>
      <HeroDoodles />

      {/* Left side: brand showcase */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center px-10">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="grid place-items-center"
            style={{
              width: 48,
              height: 48,
              background: "var(--color-orange)",
              borderRadius: 12,
              fontFamily: "var(--font-serif)",
              fontWeight: 700,
              fontSize: 24,
              color: "#fff",
            }}
          >
            U
          </div>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "var(--color-text-1)",
            }}
          >
            UniBoard
          </span>
        </div>
        <p
          className="text-lg text-center max-w-xs"
          style={{
            fontFamily: "var(--font-serif)",
            color: "var(--color-text-2)",
            lineHeight: 1.6,
          }}
        >
          Your GPA, Maximized.
        </p>
      </div>

      {/* Right side: login form */}
      <div className="flex flex-1 items-center justify-center px-6 md:px-10">
        <RoughCard
          className="w-full max-w-md p-8 rounded-[14px]"
        >
          <div style={{ background: "var(--color-card-bg)", borderRadius: "var(--radius-card)", padding: "32px" }}>
            <h1
              className="text-2xl mb-6"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {t("loginTitle")}
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-2)" }}>
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-[8px] outline-none"
                  style={{
                    border: "1px solid var(--color-card-border)",
                    background: "var(--color-cream)",
                    color: "var(--color-text-1)",
                    transition: "border-color var(--ease-fast)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--color-text-2)" }}>
                  {t("password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-sm rounded-[8px] outline-none"
                  style={{
                    border: "1px solid var(--color-card-border)",
                    background: "var(--color-cream)",
                    color: "var(--color-text-1)",
                    transition: "border-color var(--ease-fast)",
                  }}
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: "#c44" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={login.isPending}
                className="w-full py-2.5 text-sm font-medium text-white rounded-[8px] cursor-pointer disabled:opacity-60"
                style={{
                  background: "var(--color-orange)",
                  height: 42,
                  transition: "opacity var(--ease-fast)",
                }}
              >
                {login.isPending ? "..." : t("login")}
              </button>
            </form>

            <p className="mt-5 text-sm text-center" style={{ color: "var(--color-text-3)" }}>
              {t("noAccount")}{" "}
              <Link
                href={`/${locale}/register`}
                className="font-medium"
                style={{ color: "var(--color-orange)", textDecoration: "none" }}
              >
                {t("registerLink")}
              </Link>
            </p>
          </div>
        </RoughCard>
      </div>
    </>
  );
}
