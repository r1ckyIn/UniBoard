"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { useDeleteToken, useDeleteAccount } from "@/hooks/use-user";

/**
 * DangerZoneSection — disconnect tokens and delete account with confirmation dialogs.
 * Uses native <dialog> for built-in focus trap and Escape handling.
 */
export default function DangerZoneSection() {
  const t = useTranslations("settings");
  const deleteToken = useDeleteToken();
  const deleteAccount = useDeleteAccount();

  const disconnectDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDisconnect = () => {
    deleteToken.mutate({ platform: "canvas" });
    deleteToken.mutate({ platform: "ed" });
    disconnectDialogRef.current?.close();
  };

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined);
    deleteDialogRef.current?.close();
  };

  const openDeleteDialog = () => {
    setDeleteConfirmText("");
    deleteDialogRef.current?.showModal();
  };

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-[8px] mb-[4px]">
        <AlertTriangle size={18} className="text-[#cc4455]" />
        <h2 className="font-serif text-[1.1rem] font-semibold text-[#cc4455]">
          {t("danger.title")}
        </h2>
      </div>

      {/* Danger rows */}
      <div className="mt-[4px]">
        {/* Disconnect all tokens */}
        <div className="flex items-center justify-between py-[14px] border-b border-[#eae7e0]">
          <div className="flex-1">
            <div className="text-[0.84rem] font-semibold text-[#2d2d2a] mb-[2px]">
              {t("danger.disconnect.title")}
            </div>
            <div className="text-[0.72rem] text-[#9b9b94]">
              {t("danger.disconnect.desc")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => disconnectDialogRef.current?.showModal()}
            className="py-[7px] px-[16px] text-[0.76rem] font-semibold rounded-[8px] bg-transparent border-[1.5px] border-[#cc4455] text-[#cc4455] cursor-pointer transition-all duration-150 hover:bg-[rgba(204,68,85,0.11)]"
          >
            {t("danger.disconnect.button")}
          </button>
        </div>

        {/* Delete account */}
        <div className="flex items-center justify-between py-[14px]">
          <div className="flex-1">
            <div className="text-[0.84rem] font-semibold text-[#2d2d2a] mb-[2px]">
              {t("danger.delete.title")}
            </div>
            <div className="text-[0.72rem] text-[#9b9b94]">
              {t("danger.delete.desc")}
            </div>
          </div>
          <button
            type="button"
            onClick={openDeleteDialog}
            className="py-[7px] px-[16px] text-[0.76rem] font-semibold rounded-[8px] bg-transparent border-[1.5px] border-[#cc4455] text-[#cc4455] cursor-pointer transition-all duration-150 hover:bg-[rgba(204,68,85,0.11)]"
          >
            {t("danger.delete.button")}
          </button>
        </div>
      </div>

      {/* Disconnect confirmation dialog */}
      <dialog
        ref={disconnectDialogRef}
        data-testid="disconnect-dialog"
        className="p-[24px] max-w-[400px] rounded-[14px] bg-[#faf9f5] backdrop:bg-[rgba(0,0,0,0.3)]"
      >
        <h3 className="font-serif text-[1rem] font-semibold text-[#2d2d2a] mb-[8px]">
          {t("danger.disconnect.confirmTitle")}
        </h3>
        <p className="text-[0.82rem] text-[#6b6b65] mb-[18px]">
          {t("danger.disconnect.confirmDesc")}
        </p>
        <div className="flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={() => disconnectDialogRef.current?.close()}
            className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] bg-[#faf9f5] text-[#6b6b65] border border-[#e8e5dd] cursor-pointer transition-all duration-150 hover:bg-[#efede6]"
          >
            {t("danger.disconnect.cancel")}
          </button>
          <button
            type="button"
            data-testid="disconnect-confirm"
            onClick={handleDisconnect}
            className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] bg-[#cc4455] text-white border-none cursor-pointer transition-all duration-150 hover:bg-[#b33d4c]"
          >
            {t("danger.disconnect.confirmButton")}
          </button>
        </div>
      </dialog>

      {/* Delete account confirmation dialog */}
      <dialog
        ref={deleteDialogRef}
        data-testid="delete-dialog"
        className="p-[24px] max-w-[400px] rounded-[14px] bg-[#faf9f5] backdrop:bg-[rgba(0,0,0,0.3)]"
      >
        <h3 className="font-serif text-[1rem] font-semibold text-[#2d2d2a] mb-[8px]">
          {t("danger.delete.confirmTitle")}
        </h3>
        <p className="text-[0.82rem] text-[#6b6b65] mb-[14px]">
          {t("danger.delete.confirmDesc")}
        </p>
        <input
          type="text"
          data-testid="delete-input"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder={t("danger.delete.confirmPlaceholder")}
          className="w-full py-[9px] px-[12px] text-[0.84rem] border-[1.5px] border-[#e8e5dd] rounded-[8px] bg-[#faf9f5] text-[#2d2d2a] outline-none mb-[18px] transition-[border-color,box-shadow] duration-150 focus:border-[#cc4455] focus:shadow-[0_0_0_3px_rgba(204,68,85,0.11)]"
        />
        <div className="flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={() => deleteDialogRef.current?.close()}
            className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] bg-[#faf9f5] text-[#6b6b65] border border-[#e8e5dd] cursor-pointer transition-all duration-150 hover:bg-[#efede6]"
          >
            {t("danger.delete.cancel")}
          </button>
          <button
            type="button"
            data-testid="delete-confirm"
            disabled={deleteConfirmText !== "DELETE"}
            onClick={handleDeleteAccount}
            className="py-[8px] px-[16px] text-[0.78rem] font-semibold rounded-[8px] bg-[#cc4455] text-white border-none cursor-pointer transition-all duration-150 hover:bg-[#b33d4c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("danger.delete.confirmButton")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
