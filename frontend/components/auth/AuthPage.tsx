"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "motion/react";
import BrandPanel from "./BrandPanel";
import AuthFormCard from "./AuthFormCard";
import SuccessOverlay from "./SuccessOverlay";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export default function AuthPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleSwitchMode = useCallback(
    (newMode: "login" | "register") => {
      setMode(newMode);
      const params = new URLSearchParams(searchParams.toString());
      if (newMode === "register") {
        params.set("mode", "register");
      } else {
        params.delete("mode");
      }
      const query = params.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname],
  );

  return (
    <motion.div
      className="flex min-h-screen relative z-[2]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Left panel — brand showcase */}
      <motion.div
        className="flex-1 hidden min-[900px]:flex items-center justify-center p-10"
        variants={itemVariants}
      >
        <BrandPanel />
      </motion.div>

      {/* Right panel — auth form */}
      <motion.div
        className="flex-1 flex items-center justify-center p-6 relative"
        variants={itemVariants}
      >
        <div className="relative w-full max-w-[420px]">
          <AuthFormCard
            mode={mode}
            onSwitchMode={handleSwitchMode}
            onRegisterSuccess={() => setShowSuccess(true)}
          />
          <SuccessOverlay
            visible={showSuccess}
            onContinue={() => router.push("/setup")}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
