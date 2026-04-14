import React from "react";
import { useTranslation } from "react-i18next";

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md p-6">

        <h2 className="text-xl font-bold text-on-surface mb-3">
          {title}
        </h2>

        <p className="text-on-surface-variant mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-error text-on-error font-bold hover:bg-error/90 transition"
          >
            {t("common.confirm")}
          </button>
        </div>

      </div>
    </div>
  );
}
