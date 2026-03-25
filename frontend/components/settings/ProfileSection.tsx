"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { format } from "date-fns";
import type { components } from "@/lib/api/types.gen";
import { useUpdateProfile } from "@/hooks/use-user";

type UserType = components["schemas"]["User"];

interface ProfileSectionProps {
  user: UserType;
}

/**
 * ProfileSection — editable display name, readonly email, disabled password fields.
 * Calls useUpdateProfile to persist display name changes.
 */
export default function ProfileSection({ user }: ProfileSectionProps) {
  const t = useTranslations("settings");
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState(user.display_name);

  const handleSave = () => {
    updateProfile.mutate({ display_name: displayName });
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-[8px] mb-[4px]">
        <User size={18} className="text-[#6b6b65]" />
        <h2 className="font-serif text-[1.1rem] font-semibold text-[#2d2d2a]">
          {t("profile.title")}
        </h2>
      </div>
      <p className="text-[0.82rem] text-[#9b9b94] mb-[18px]">{t("profile.desc")}</p>

      {/* Profile form */}
      <div className="flex flex-col gap-[16px]">
        {/* Display Name */}
        <div className="flex flex-col gap-[4px]">
          <label className="text-[0.72rem] font-semibold text-[#9b9b94]">
            {t("profile.displayName")}
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="py-[9px] px-[12px] text-[0.84rem] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#d97757] focus:shadow-[0_0_0_3px_rgba(217,119,87,0.11)]"
          />
        </div>

        {/* Email (readonly) */}
        <div className="flex flex-col gap-[4px]">
          <label className="text-[0.72rem] font-semibold text-[#9b9b94]">
            {t("profile.email")}
          </label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="py-[9px] px-[12px] text-[0.84rem] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#efede6] text-[#9b9b94] cursor-default outline-none"
          />
          <span className="text-[0.66rem] text-[#9b9b94]">{t("profile.emailHint")}</span>
        </div>

        {/* Password (disabled) */}
        <div className="opacity-[0.45] pointer-events-none">
          <div className="flex flex-col gap-[4px]">
            <label className="text-[0.72rem] font-semibold text-[#9b9b94]">
              {t("profile.password")}
            </label>
            <input
              type="password"
              placeholder={t("profile.currentPassword")}
              disabled
              className="py-[9px] px-[12px] text-[0.84rem] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none mb-[8px]"
            />
            <input
              type="password"
              placeholder={t("profile.newPassword")}
              disabled
              className="py-[9px] px-[12px] text-[0.84rem] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none"
            />
            <span className="text-[0.66rem] text-[#9b9b94]">{t("profile.passwordHint")}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-[14px] border-t border-[#eae7e0]">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] bg-[#d97757] text-white border-none cursor-pointer transition-all duration-150 hover:bg-[#c5674a]"
          >
            {t("profile.saveChanges")}
          </button>
          <span className="text-[0.72rem] text-[#9b9b94]">
            {t("profile.accountCreated", {
              date: format(new Date(user.created_at), "d MMM yyyy"),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
