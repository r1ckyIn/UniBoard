"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion } from "motion/react";
import BrandPanel from "./BrandPanel";
import AuthFormCard from "./AuthFormCard";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

// 3D book-opening animation: the auth page opens like a book
// Left panel (brand) swings from its right edge, right panel (form) from its left edge
const bookVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const pageVariants = (initialRotateY: number) => ({
  hidden: { rotateY: initialRotateY, opacity: 0 },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 60, damping: 15, mass: 1 },
  },
});

const leftPageVariants = pageVariants(-90);
const rightPageVariants = pageVariants(90);

function getInitialMode(searchParams: URLSearchParams): AuthMode {
  const modeParam = searchParams.get("mode");
  if (modeParam === "register") return "register";
  if (modeParam === "forgot-password") return "forgot-password";
  if (modeParam === "reset-password") return "reset-password";
  return "login";
}

export default function AuthPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations();
  const [mode, setMode] = useState<AuthMode>(
    () => getInitialMode(searchParams),
  );

  // Show error toast if email confirmation failed
  useEffect(() => {
    if (searchParams.get("error") === "confirmation_failed") {
      toast.error(t("auth.errors.confirmationFailed"));
    }
  }, [searchParams, t]);

  const handleSwitchMode = useCallback(
    (newMode: AuthMode) => {
      setMode(newMode);
      const params = new URLSearchParams(searchParams.toString());
      if (newMode === "login") {
        params.delete("mode");
      } else {
        params.set("mode", newMode);
      }
      const query = params.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname],
  );

  return (
    <motion.div
      className="flex min-h-screen relative z-[2]"
      style={{ perspective: 1200 }}
      variants={bookVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Left panel — brand showcase (swings open from right edge like a book page) */}
      <motion.div
        className="flex-1 hidden min-[900px]:flex items-center justify-center p-10"
        variants={leftPageVariants}
        style={{ transformOrigin: "right center", transformStyle: "preserve-3d" }}
      >
        <BrandPanel />
      </motion.div>

      {/* Right panel — auth form (swings open from left edge like a book page) */}
      <motion.div
        className="flex-1 flex items-center justify-center p-6 relative"
        variants={rightPageVariants}
        style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
      >
        <div className="relative w-full max-w-[420px]">
          <AuthFormCard
            mode={mode}
            onSwitchMode={handleSwitchMode}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
