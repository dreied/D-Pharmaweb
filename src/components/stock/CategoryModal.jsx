import { useTranslation } from "react-i18next";

export default function CategoryModal({
  showAddCategoryModal,
  setShowAddCategoryModal,
  newCategoryName,
  setNewCategoryName,
  addNewCategory,
}) {
  const { t } = useTranslation();

  if (!showAddCategoryModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-primary-dim">
            {t("stock.addCategory")}
          </h2>
          <button
            onClick={() => setShowAddCategoryModal(false)}
            className="text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6">
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.category")}
          </label>
          <input
            className="input"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant/20">
          <button
            onClick={() => setShowAddCategoryModal(false)}
            className="px-6 py-2.5 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={addNewCategory}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary-container transition"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
