import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db/index";
import { useAuth } from "../../context/AuthContext";

import ConfirmDeleteModal from "../product/ConfirmDeleteModal";
import ConfirmSaveModal from "../product/ConfirmSaveModal";

export default function ProductForm({ product, onSave }) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === "admin";

  const [useNewCurrency, setUseNewCurrency] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  const [form, setForm] = useState({
    nameEn: product.nameEn || "",
    nameAr: product.nameAr || "",
    barcode: product.barcode || "",
    form: product.form || "",
    minQty: product.minQty ?? 0,
    purchasePrice: product.purchasePrice ?? 0,
    salePrice: product.salePrice ?? 0,
    cabinet: product.cabinet || "",
    shelf: product.shelf || "",
    shelfRow: product.shelfRow || "",
    isAccessory: product.isAccessory === true,
  });

  useEffect(() => {
    async function load() {
      const setting = await db.appSettings.get("use_new_currency");
      setUseNewCurrency(setting?.value === true);
    }
    load();
  }, []);

  function displayPrice(value) {
    return useNewCurrency ? value / 100 : value;
  }

  function storePrice(value) {
    let num = Number(value);
    if (isNaN(num) || num < 0) num = 0;
    return useNewCurrency ? num * 100 : num;
  }

  function updatePrice(key, value) {
    if (!isAdmin) return;
    setForm({ ...form, [key]: storePrice(value) });
  }

  function updateField(key, value) {
    if (!isAdmin) return;
    setForm({ ...form, [key]: value });
  }

  function handleSave() {
    if (!isAdmin) return;
    setShowConfirmSave(true);
  }

  function confirmSave() {
    if (!isAdmin) return;

    const finalPurchasePrice = form.isAccessory
      ? product.purchasePrice
      : form.purchasePrice;

    const finalSalePrice = form.isAccessory
      ? product.salePrice
      : form.salePrice;

    onSave({
      ...product,
      ...form,
      purchasePrice: finalPurchasePrice,
      salePrice: finalSalePrice,
    });

    setShowConfirmSave(false);
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 p-6 bg-surface-container-low shadow-sm">
      <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined">inventory_2</span>
        {t("productDetails")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Name EN */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.nameEn")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.nameEn}
            onChange={(e) => updateField("nameEn", e.target.value)}
          />
        </div>

        {/* Name AR */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.nameAr")}
          </label>
          <input
            disabled={!isAdmin}
            dir="rtl"
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.nameAr}
            onChange={(e) => updateField("nameAr", e.target.value)}
          />
        </div>

        {/* Barcode */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.barcode")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.barcode}
            onChange={(e) => updateField("barcode", e.target.value)}
          />
        </div>

        {/* Form */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.form")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.form}
            onChange={(e) => updateField("form", e.target.value)}
          />
        </div>

        {/* isAccessory */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={form.isAccessory}
              onChange={(e) => updateField("isAccessory", e.target.checked)}
            />
            <label className="text-sm font-medium">
              {t("stock.isAccessory")}
            </label>
          </div>
        </div>

        {/* Purchase + Sale Price */}
        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.purchasePrice")}
            </label>
            <input
              disabled={!isAdmin}
              type="number"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
              value={displayPrice(form.purchasePrice)}
              onChange={(e) => updatePrice("purchasePrice", e.target.value)}
            />
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.salePrice")}
            </label>
            <input
              disabled={!isAdmin}
              type="number"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
              value={displayPrice(form.salePrice)}
              onChange={(e) => updatePrice("salePrice", e.target.value)}
            />
          </div>
        </div>

        {/* Min Qty */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.minQty")}
          </label>
          <input
            disabled={!isAdmin}
            type="number"
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.minQty}
            onChange={(e) =>
              updateField("minQty", Math.max(0, Number(e.target.value)))
            }
          />
        </div>

        {/* Cabinet */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.cabinet")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.cabinet}
            onChange={(e) => updateField("cabinet", e.target.value)}
          />
        </div>

        {/* Shelf */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.shelf")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.shelf}
            onChange={(e) => updateField("shelf", e.target.value)}
          />
        </div>

        {/* Row */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {t("stock.row")}
          </label>
          <input
            disabled={!isAdmin}
            className="w-full pl-3 pr-3 py-2 rounded-lg border border-outline-variant disabled:bg-gray-200"
            value={form.shelfRow}
            onChange={(e) => updateField("shelfRow", e.target.value)}
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      {isAdmin && (
        <button
          className="mt-6 w-full py-3 rounded-lg bg-primary text-white font-bold flex items-center justify-center gap-2"
          onClick={handleSave}
        >
          <span className="material-symbols-outlined">save</span>
          {t("saveProduct")}
        </button>
      )}

      {/* CONFIRM SAVE MODAL */}
      {showConfirmSave && (
        <ConfirmSaveModal
          title={t("confirm")}
          message={t("confirmSaveProduct")}
          onConfirm={confirmSave}
          onCancel={() => setShowConfirmSave(false)}
        />
      )}
    </div>
  );
}
