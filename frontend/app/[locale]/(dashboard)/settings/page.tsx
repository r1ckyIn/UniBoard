"use client";

import { Settings } from "lucide-react";
import TokenManager from "@/components/settings/TokenManager";
import GPATargetSetting from "@/components/settings/GPATargetSetting";
import CourseLinking from "@/components/settings/CourseLinking";
import UserProfile from "@/components/settings/UserProfile";

/**
 * Settings page with 4 sections:
 * 1. TokenManager (most commonly used)
 * 2. GPATargetSetting
 * 3. CourseLinking (simplified)
 * 4. UserProfile
 */
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings size={24} style={{ color: "var(--color-orange)" }} />
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Settings
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>
          Manage your tokens, preferences, and account
        </p>
      </div>

      {/* Sections */}
      <TokenManager />
      <GPATargetSetting />
      <CourseLinking />
      <UserProfile />
    </div>
  );
}
