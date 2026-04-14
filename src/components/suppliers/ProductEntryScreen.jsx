import React from "react";
import { useTranslation } from "react-i18next";

export default function ProductEntryScreen({
  item,
  onChange,
  searchValue,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  onScan,
  showStorage,
  onToggleStorage,
  displayPrice,
  handlePriceInput,
}) {
  const { t, i18n } = useTranslation();
const isRTL = i18n.language === "ar";


  return (
    <div className="space-y-6">

      {/* UNIVERSAL SEARCH + SCAN */}
      <div className="relative mb-2">
        <label className="text-sm font-bold mb-1 block text-on-surface">
          {t("stock.searchUniversal")}
        </label>

        <input
          className="input"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <button
  onClick={onScan}
  className={`
    absolute top-[38px] text-primary
    ${isRTL ? "left-3" : "right-3"}
  `}
>
  <span className="material-symbols-outlined">barcode_scanner</span>
</button>

      </div>

      {/* UNIVERSAL RESULTS */}
      {searchResults.length > 0 && (
        <div className="bg-surface-container-low rounded-xl shadow border max-h-60 overflow-y-auto mb-4">
          {searchResults.map((u, i) => (
            <div
              key={i}
              onClick={() => onSelectSearchResult(u)}
              className="px-4 py-3 hover:bg-surface-container-high cursor-pointer"
            >
              <div className="font-bold text-primary-dim">{u.nameEn}</div>
              <div className="text-sm text-on-surface-variant">{u.nameAr}</div>
              <div className="text-xs text-on-surface-variant/70">
                {t("stock.barcode")}: {u.barcode}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* BASIC FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.nameEn")}
          </label>
          <input
            className="input"
            value={item.nameEn}
            onChange={(e) => onChange({ nameEn: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.nameAr")}
          </label>
          <input
            className="input"
            value={item.nameAr}
            onChange={(e) => onChange({ nameAr: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.barcode")}
          </label>
          <input
            className="input"
            value={item.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.form")}
          </label>
          <input
            className="input"
            value={item.form}
            onChange={(e) => onChange({ form: e.target.value })}
          />
        </div>
      </div>

      {/* STORAGE TOGGLE */}
      <button
        className="flex items-center gap-2 text-primary font-bold mt-2"
        onClick={onToggleStorage}
      >
        <span className="material-symbols-outlined">
          {showStorage ? "expand_less" : "expand_more"}
        </span>
        {showStorage ? t("stock.hideStorage") : t("stock.showStorage")}
      </button>

      {showStorage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div>
            <label className="text-sm font-bold mb-1 block text-on-surface">
              {t("stock.cabinet")}
            </label>
            <input
              className="input"
              value={item.cabinet}
              onChange={(e) => onChange({ cabinet: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-bold mb-1 block text-on-surface">
              {t("stock.shelf")}
            </label>
            <input
              className="input"
              value={item.shelf}
              onChange={(e) => onChange({ shelf: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-bold mb-1 block text-on-surface">
              {t("stock.row")}
            </label>
            <input
              className="input"
              value={item.shelfRow}
              onChange={(e) => onChange({ shelfRow: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* BATCH / EXPIRY / QTY / PRICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.batchId")}
          </label>
          <input
            className="input"
            value={item.batch}
            onChange={(e) => onChange({ batch: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.expiryDate")}
          </label>
          <input
            type="date"
            className="input"
            value={item.expiry}
            onChange={(e) => onChange({ expiry: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.quantity")}
          </label>
          <input
            type="number"
            className="input"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.purchasePrice")}
          </label>
          <input
            type="number"
            className="input"
            value={displayPrice(item.purchasePrice)}
            onChange={(e) =>
              onChange({ purchasePrice: handlePriceInput(e.target.value) })
            }
          />
        </div>

        <div>
          <label className="text-sm font-bold mb-1 block text-on-surface">
            {t("stock.salePrice")}
          </label>
          <input
            type="number"
            className="input"
            value={displayPrice(item.salePrice)}
            onChange={(e) =>
              onChange({ salePrice: handlePriceInput(e.target.value) })
            }
          />
        </div>
      </div>
    </div>
  );
}
