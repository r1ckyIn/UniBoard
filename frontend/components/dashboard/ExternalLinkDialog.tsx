"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

interface ExternalLinkDialogProps {
  open: boolean;
  url: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ExternalLinkDialog({
  open,
  url,
  onConfirm,
  onCancel,
}: ExternalLinkDialogProps) {
  const t = useTranslations("dashboard");
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sync open prop with native dialog showModal/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Handle native cancel event (Escape key)
  const handleCancel = useCallback(
    (e: React.SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      onCancel();
    },
    [onCancel]
  );

  const handleConfirm = useCallback(() => {
    window.open(url, "_blank", "noopener,noreferrer");
    onConfirm();
  }, [url, onConfirm]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="max-w-[360px] bg-white rounded-[12px] p-6 shadow-lg border-none backdrop:bg-black/30"
    >
      {/* Title */}
      <h2 className="font-serif text-[0.88rem] font-semibold text-text-1 mb-2">
        {t("externalLink.title")}
      </h2>

      {/* Body text */}
      <p className="text-[0.88rem] text-text-2 mb-1">
        {t("externalLink.body")}
      </p>

      {/* URL preview */}
      <div className="text-[0.66rem] text-text-3 bg-card-bg py-1 px-3 rounded-[6px] mb-4 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
        {url}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 px-4 border border-card-border rounded-[8px] text-text-2 bg-card-bg text-[14px] font-semibold cursor-pointer transition-colors hover:bg-card-bg-hover"
        >
          {t("externalLink.cancel")}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="py-2 px-4 bg-[#d97757] text-white rounded-[8px] border-none text-[14px] font-semibold cursor-pointer transition-colors hover:bg-[#c5674a]"
        >
          {t("externalLink.confirm")}
        </button>
      </div>
    </dialog>
  );
}
