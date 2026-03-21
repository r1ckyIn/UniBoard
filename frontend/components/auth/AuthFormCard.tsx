"use client";

import { motion, AnimatePresence } from "motion/react";
import RoughCard from "@/components/design-system/RoughCard";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface AuthFormCardProps {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
  onRegisterSuccess: () => void;
}

export default function AuthFormCard({
  mode,
  onSwitchMode,
  onRegisterSuccess,
}: AuthFormCardProps) {
  return (
    <motion.div
      layout
      transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}
      className="w-full max-w-[420px]"
    >
      <RoughCard padding="px-8 py-9" className="overflow-hidden" disableHover>
        <AnimatePresence mode="wait" initial={false}>
          {mode === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <LoginForm
                onSwitchToRegister={() => onSwitchMode("register")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <RegisterForm
                onSwitchToLogin={() => onSwitchMode("login")}
                onRegisterSuccess={onRegisterSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </RoughCard>
    </motion.div>
  );
}
