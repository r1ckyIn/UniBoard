"use client";

import { motion, AnimatePresence } from "motion/react";
import RoughCard from "@/components/design-system/RoughCard";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import UpdatePasswordForm from "./UpdatePasswordForm";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

interface AuthFormCardProps {
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
}

export default function AuthFormCard({
  mode,
  onSwitchMode,
}: AuthFormCardProps) {
  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
  };

  return (
    <motion.div
      layout
      transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
      className="w-full max-w-[420px]"
    >
      <RoughCard padding="px-8 py-9" disableHover>
        <AnimatePresence mode="wait" initial={false}>
          {mode === "login" && (
            <motion.div key="login" {...motionProps}>
              <LoginForm
                onSwitchToRegister={() => onSwitchMode("register")}
                onSwitchToForgotPassword={() => onSwitchMode("forgot-password")}
              />
            </motion.div>
          )}
          {mode === "register" && (
            <motion.div key="register" {...motionProps}>
              <RegisterForm
                onSwitchToLogin={() => onSwitchMode("login")}
              />
            </motion.div>
          )}
          {mode === "forgot-password" && (
            <motion.div key="forgot-password" {...motionProps}>
              <ForgotPasswordForm
                onSwitchToLogin={() => onSwitchMode("login")}
              />
            </motion.div>
          )}
          {mode === "reset-password" && (
            <motion.div key="reset-password" {...motionProps}>
              <UpdatePasswordForm
                onSwitchToLogin={() => onSwitchMode("login")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </RoughCard>
    </motion.div>
  );
}
