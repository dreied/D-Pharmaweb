import { useTranslation } from "react-i18next";
import CategoryModal from "./CategoryModal";
import { generateNextBatch } from "../../utils/batchGenerator";

export default function AddStockModal({
  showAddModal,
  setShowAddModal,
  searchUniversal,
  handleUniversalSearch,
  universalResults,
  autofillFromUniversal,
  openBarcodeScanner,
  newItem,
  setNewItem,
  categories,
  showStorageSection,
  setShowStorageSection,
  displayPrice,
  handlePriceInput,
  handleAddStock,
  showAddCategoryModal,        // ⭐ REQUIRED
  setShowAddCategoryModal,     // ⭐ REQUIRED
  newCategoryName,             // ⭐ REQUIRED
  setNewCategoryName,          // ⭐ REQUIRED
  addNewCategory,              // ⭐ REQUIRED
}) {
  const { t, i18n } = useTranslation();


  if (!showAddModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col">

        {/* HEADER */}
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-xl font-bold font-headline text-primary-dim">
            {t("stock.addNewItem")}
          </h2>
          <button
            onClick={() => setShowAddModal(false)}
            className="text-on-surface-variant hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto">

          {/* UNIVERSAL SEARCH */}
          <div className="p-6">
            <div className="relative">
  <input
  className={`input ${
    i18n.language === "ar" ? "input-icon-left" : "input-icon-right"
  }`}
  placeholder={t("stock.searchUniversal")}
  value={searchUniversal}
  onChange={(e) => handleUniversalSearch(e.target.value)}
/>


  <button
  onClick={openBarcodeScanner}
  className={`
    absolute top-1/2 -translate-y-1/2 text-primary
    ${i18n.language === "ar" ? "left-3" : "right-3"}
  `}
>
  <span className="material-symbols-outlined">barcode_scanner</span>
</button>

</div>


            {universalResults.length > 0 && (
              <div className="mt-2 bg-surface-container-low rounded-xl shadow-lg border border-outline-variant/20 max-h-60 overflow-y-auto">
                {universalResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
  autofillFromUniversal(item);
}}

                    className="px-4 py-3 hover:bg-surface-container-high cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-primary-dim">{item.nameEn}</div>
                    <div className="text-sm text-on-surface-variant">{item.nameAr}</div>
                    <div className="text-xs text-on-surface-variant/70">
                      {t("stock.barcode")}: {item.barcode}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT FIELDS */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Name EN */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.nameEn")}</label>
              <input
                className="input"
                value={newItem.nameEn}
                onChange={(e) => setNewItem({ ...newItem, nameEn: e.target.value })}
              />
            </div>

            {/* Name AR */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.nameAr")}</label>
              <input
                className="input"
                value={newItem.nameAr}
                onChange={(e) => setNewItem({ ...newItem, nameAr: e.target.value })}
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.barcode")}</label>
              <input
                className="input"
                value={newItem.barcode}
                onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
              />
            </div>

            {/* Form */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.form")}</label>
              <input
                className="input"
                value={newItem.form}
                onChange={(e) => setNewItem({ ...newItem, form: e.target.value })}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.category")}</label>
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={newItem.categoryId || ""}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: Number(e.target.value) })}
                >
                  <option value="">{t("stock.selectCategory")}</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCategoryModal(true)}
                  className="px-3 py-2 bg-primary text-white rounded-lg"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>

            {/* isAccessory */}
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={newItem.isAccessory}
                onChange={(e) => setNewItem({ ...newItem, isAccessory: e.target.checked })}
              />
              <label className="text-sm font-bold text-on-surface">{t("stock.isAccessory")}</label>
            </div>

            {/* Min Qty */}
            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.minQty")}</label>
              <input
                type="number"
                className="input"
                value={newItem.minQty}
                onChange={(e) => setNewItem({ ...newItem, minQty: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* STORAGE SECTION */}
          <div className="px-6">
            <button
              onClick={() => setShowStorageSection(!showStorageSection)}
              className="flex items-center gap-2 text-primary font-bold mb-3"
            >
              <span className="material-symbols-outlined">
                {showStorageSection ? "expand_less" : "expand_more"}
              </span>
              {t("stock.storage")}
            </button>

            {showStorageSection && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.cabinet")}</label>
                  <input
                    className="input"
                    value={newItem.cabinet}
                    onChange={(e) => setNewItem({ ...newItem, cabinet: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.shelf")}</label>
                  <input
                    className="input"
                    value={newItem.shelf}
                    onChange={(e) => setNewItem({ ...newItem, shelf: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.row")}</label>
                  <input
                    className="input"
                    value={newItem.shelfRow}
                    onChange={(e) => setNewItem({ ...newItem, shelfRow: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* BATCH FIELDS */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.batchId")}</label>
              <input
                className="input"
                value={newItem.batch}
                onChange={(e) => setNewItem({ ...newItem, batch: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.expiryDate")}</label>
              <input
  type="date"
  className="input"
  value={newItem.expiry}
  onChange={(e) => {
    const expiry = e.target.value;

    // Update expiry immediately
    setNewItem((prev) => ({ ...prev, expiry }));

    // Auto-generate batch AFTER expiry is set
    setTimeout(() => {
      setNewItem((prev) => {
        // Only generate if batch is empty AND product has a name
        if (
          !prev.batch &&
          prev.expiry &&
          (prev.nameEn || prev.nameAr)
        ) {
          generateNextBatch(prev.nameEn || prev.nameAr).then((batch) => {
            setNewItem((p) => ({ ...p, batch }));
          });
        }
        return prev;
      });
    }, 0);
  }}
/>



            </div>

            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.quantity")}</label>
              <input
                type="number"
                className="input"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.purchasePrice")}</label>
              <input
                type="number"
                className="input"
                value={displayPrice(newItem.purchasePrice)}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    purchasePrice: handlePriceInput(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-bold mb-1 block text-on-surface">{t("stock.salePrice")}</label>
              <input
                type="number"
                className="input"
                value={displayPrice(newItem.salePrice)}
                onChange={(e) =>
                  setNewItem({
                    ...newItem,
                    salePrice: handlePriceInput(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-surface-container-low flex justify-end gap-3 border-t border-outline-variant/20">
          <button
            onClick={() => setShowAddModal(false)}
            className="px-6 py-2.5 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleAddStock}
            className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:opacity-90"
          >
            {t("common.confirm")}
          </button>
        </div>
      </div>
      {/* ADD CATEGORY MODAL */}
  {showAddCategoryModal && (
    <CategoryModal
      showAddCategoryModal={showAddCategoryModal}
      setShowAddCategoryModal={setShowAddCategoryModal}
      newCategoryName={newCategoryName}
      setNewCategoryName={setNewCategoryName}
      addNewCategory={addNewCategory}   // ⭐ REQUIRED
    />
  )}
    </div>
  );
}
