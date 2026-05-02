"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "uniboard-notification-prefs";

interface NotificationPrefs {
  reminder72h: boolean;
  reminder24h: boolean;
  reminder3h: boolean;
  gpaRiskAlert: boolean;
  digestFrequency: "daily" | "weekly";
  emailNotifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  reminder72h: true,
  reminder24h: true,
  reminder3h: false,
  gpaRiskAlert: true,
  digestFrequency: "daily",
  emailNotifications: true,
};

/**
 * Notification preferences section with toggle switches + localStorage persistence.
 * Manages deadline reminders, GPA risk alert, digest frequency, and email toggles.
 */
export default function NotificationsSection() {
  const t = useTranslations("settings");
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPrefs>;
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Fallback to defaults on parse error
    }
  }, []);

  // Save to localStorage on every change
  const savePrefs = useCallback((updated: NotificationPrefs) => {
    setPrefs(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail if storage is full
    }
  }, []);

  function togglePref(key: keyof Omit<NotificationPrefs, "digestFrequency">) {
    savePrefs({ ...prefs, [key]: !prefs[key] });
  }

  function setDigestFrequency(freq: "daily" | "weekly") {
    if (prefs.digestFrequency === freq) return;
    savePrefs({ ...prefs, digestFrequency: freq });
  }

  return (
    <div>
      {/* Deadline Reminders */}
      <div className="mb-[18px]">
        <h3 className="text-[0.82rem] font-semibold text-[#2d2d2a] mb-[10px]">
          {t("notifications.deadlineReminders")}
        </h3>
        <div className="flex flex-col gap-[10px]">
          <ToggleRow
            label={t("notifications.reminder72h")}
            checked={prefs.reminder72h}
            onChange={() => togglePref("reminder72h")}
            testId="toggle-reminder72h"
          />
          <ToggleRow
            label={t("notifications.reminder24h")}
            checked={prefs.reminder24h}
            onChange={() => togglePref("reminder24h")}
            testId="toggle-reminder24h"
          />
          <ToggleRow
            label={t("notifications.reminder3h")}
            checked={prefs.reminder3h}
            onChange={() => togglePref("reminder3h")}
            testId="toggle-reminder3h"
          />
        </div>
      </div>

      {/* GPA Risk Alert */}
      <div className="mb-[18px] pt-[14px] border-t border-[#eae7e0]">
        <ToggleRow
          label={t("notifications.gpaRiskAlert")}
          checked={prefs.gpaRiskAlert}
          onChange={() => togglePref("gpaRiskAlert")}
          testId="toggle-gpaRiskAlert"
        />
        <p className="text-[0.72rem] text-[#9b9b94] mt-[4px]">
          {t("notifications.gpaRiskDesc")}
        </p>
      </div>

      {/* Digest Frequency */}
      <div className="mb-[18px] pt-[14px] border-t border-[#eae7e0]">
        <h3 className="text-[0.82rem] font-semibold text-[#2d2d2a] mb-[10px]">
          {t("notifications.digestFrequency")}
        </h3>
        <div className="flex gap-[8px]">
          <button
            type="button"
            onClick={() => setDigestFrequency("daily")}
            className={`py-[7px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] border transition-claude-fast cursor-pointer ${
              prefs.digestFrequency === "daily"
                ? "bg-[#d97757] text-white border-[#d97757]"
                : "bg-[#faf9f5] text-[#6b6b65] border-[#e8e5dd] hover:bg-[#efede6]"
            }`}
          >
            {t("notifications.daily")}
          </button>
          <button
            type="button"
            onClick={() => setDigestFrequency("weekly")}
            className={`py-[7px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] border transition-claude-fast cursor-pointer ${
              prefs.digestFrequency === "weekly"
                ? "bg-[#d97757] text-white border-[#d97757]"
                : "bg-[#faf9f5] text-[#6b6b65] border-[#e8e5dd] hover:bg-[#efede6]"
            }`}
          >
            {t("notifications.weekly")}
          </button>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="pt-[14px] border-t border-[#eae7e0]">
        <ToggleRow
          label={t("notifications.emailNotifications")}
          checked={prefs.emailNotifications}
          onChange={() => togglePref("emailNotifications")}
          testId="toggle-emailNotifications"
        />
        <p className="text-[0.72rem] text-[#9b9b94] mt-[4px]">
          {t("notifications.emailDesc")}
        </p>
      </div>
    </div>
  );
}

// ── Inline toggle component ────────────────────────────────────────────────
interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  testId: string;
}

function ToggleRow({ label, checked, onChange, testId }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[0.82rem] text-[#2d2d2a]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        data-testid={testId}
        className="appearance-none w-[44px] h-[24px] rounded-full bg-[#e8e5dd] cursor-pointer transition-claude-fast relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[20px] after:h-[20px] after:rounded-full after:bg-white after:shadow-sm after:transition-all after:[transition-duration:var(--motion-fast)] after:[transition-timing-function:var(--ease-claude-out)] checked:bg-[#d97757] checked:after:translate-x-[20px]"
      />
    </label>
  );
}
