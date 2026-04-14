import React from "react";
import { useTranslation } from "react-i18next";

export default function ConfirmSaveModal({ title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[999999]">
      <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-80 space-y-4 border border-outline-variant">
        
        {/* Title */}
        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">help</span>
          {title}
        </h2>

        {/* Message */}
        <p className="text-on-surface-variant">{message}</p>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition font-medium"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-dim transition font-bold"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
