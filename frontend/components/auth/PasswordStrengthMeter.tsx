"use client";

import { useTranslations } from "next-intl";

interface PasswordStrengthMeterProps {
  strength: 0 | 1 | 2 | 3 | 4;
}

const BAR_COLORS: Record<number, string> = {
  1: "bg-[#cc4455]",
  2: "bg-[#b08968]",
  3: "bg-[#b08968]",
  4: "bg-[#788c5d]",
};

const LABEL_COLORS: Record<number, string> = {
  1: "text-[#cc4455]",
  2: "text-[#b08968]",
  3: "text-[#b08968]",
  4: "text-[#788c5d]",
};

const LABEL_KEYS: Record<number, string> = {
  1: "auth.passwordStrength.weak",
  2: "auth.passwordStrength.fair",
  3: "auth.passwordStrength.good",
  4: "auth.passwordStrength.strong",
};

export default function PasswordStrengthMeter({
  strength,
}: PasswordStrengthMeterProps) {
  const t = useTranslations();

  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid="pw-bar"
            className={`h-[3px] flex-1 rounded-sm transition-claude-fast ${
              i < strength ? BAR_COLORS[strength] : "bg-divider"
            }`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p
          className={`text-[0.66rem] font-semibold mt-0.5 ${LABEL_COLORS[strength]}`}
        >
          {t(LABEL_KEYS[strength])}
        </p>
      )}
    </div>
  );
}
