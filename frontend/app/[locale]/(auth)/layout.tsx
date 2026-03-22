"use client";

import { Toaster } from "sonner";
import { withClientOnly } from "@/components/design-system/ClientOnly";
import LanguageSwitcher from "@/components/auth/LanguageSwitcher";

const AuthDoodles = withClientOnly(
  () => import("@/components/auth/AuthDoodles"),
);

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative bg-cream">
      <AuthDoodles />
      <LanguageSwitcher />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "var(--font-inter)",
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-divider)",
            color: "var(--color-text-1)",
          },
        }}
      />
      {children}
    </div>
  );
}
