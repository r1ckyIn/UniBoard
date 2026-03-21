"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion } from "motion/react";
import BrandPanel from "./BrandPanel";
import AuthFormCard from "./AuthFormCard";
import SuccessOverlay from "./SuccessOverlay";

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

const leftPageVariants = {
  hidden: {
    rotateY: -90,
    opacity: 0,
  },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 60,
      damping: 15,
      mass: 1,
    },
  },
};

const rightPageVariants = {
  hidden: {
    rotateY: 90,
    opacity: 0,
  },
  visible: {
    rotateY: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 60,
      damping: 15,
      mass: 1,
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
