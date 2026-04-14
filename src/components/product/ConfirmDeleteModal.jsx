import { useTranslation } from "react-i18next";

export default function ConfirmDeleteModal({ title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();

  const isDelete =
    title.toLowerCase().includes("delete") ||
    title.toLowerCase().includes("حذف");

  return (
    <div className="modal-overlay">
      <div className="modal confirm-modal">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="mt-2">{message}</p>

        <div className="modal-actions flex gap-3 mt-6 justify-end">
          {/* CONFIRM BUTTON */}
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg font-bold transition
              ${isDelete 
                ? "bg-error text-on-error hover:bg-error-container" 
                : "bg-primary text-on-primary hover:bg-primary-container"
              }
            `}
          >
            {t("confirm")}
          </button>

          {/* CANCEL BUTTON */}
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
