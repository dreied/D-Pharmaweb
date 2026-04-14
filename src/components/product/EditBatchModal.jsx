import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db/index";

import { convertPrice } from "../../currency";
import ConfirmSaveModal from "../product/ConfirmSaveModal";   // ✅ FIXED

export default function EditBatchModal({ batch, onClose, reload }) {
  const { t } = useTranslation();

  const [isAccessory, setIsAccessory] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  const [form, setForm] = useState({
    batch: batch.batch || "",
    expiry: batch.expiry || "",
    quantity: batch.quantity ?? 0,
    purchasePrice: batch.purchasePrice ?? 0,
    salePrice: batch.salePrice ?? 0,
  });

  useEffect(() => {
    async function loadProduct() {
      const p = await db.stockProducts.get(batch.stockProductId);
      setIsAccessory(p?.isAccessory === true);
    }
    loadProduct();
  }, [batch.stockProductId]);

  function updateField(key, value) {
    setForm({ ...form, [key]: value });
  }

  function save() {
    setShowConfirmSave(true);
  }

  async function confirmSave() {
    const updateData = {
      batch: form.batch,
      expiry: form.expiry,
      quantity: form.quantity,
    };

    if (!isAccessory) {
      updateData.purchasePrice = form.purchasePrice;
      updateData.salePrice = form.salePrice;
    }

    await db.stockBatches.update(batch.id, updateData);
    reload();
    onClose();
  }

  return (
    <div className="modal">
      <div className="modal-content p-6 rounded-xl bg-white shadow-xl w-[400px]">
        <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">edit</span>
          {t("editBatch")}
        </h3>

        <div className="space-y-4">
          {/* Batch ID */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.batchId")}
            </label>
            <input
              className="form-input"
              value={form.batch}
              onChange={(e) => updateField("batch", e.target.value)}
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.expiryDate")}
            </label>
            <input
              type="date"
              className="form-input"
              value={form.expiry}
              onChange={(e) => updateField("expiry", e.target.value)}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.quantity")}
            </label>
            <input
              type="number"
              className="form-input"
              value={form.quantity}
              onChange={(e) =>
                updateField("quantity", Number(e.target.value))
              }
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.purchasePrice")}
            </label>
            <input
              type="number"
              className="form-input"
              disabled={isAccessory}
              value={convertPrice(form.purchasePrice, false)}
              onChange={(e) =>
                updateField("purchasePrice", Number(e.target.value))
              }
            />
          </div>

          {/* Sale Price */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t("stock.salePrice")}
            </label>
            <input
              type="number"
              className="form-input"
              disabled={isAccessory}
              value={convertPrice(form.salePrice, false)}
              onChange={(e) =>
                updateField("salePrice", Number(e.target.value))
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 rounded-lg bg-slate-200"
            onClick={onClose}
          >
            {t("cancel")}
          </button>

          <button
            className="px-4 py-2 rounded-lg bg-primary text-white flex items-center gap-2"
            onClick={save}
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {t("saveChanges")}
          </button>
        </div>
      </div>

      {/* CONFIRM SAVE MODAL */}
      {showConfirmSave && (
        <ConfirmSaveModal
          title={t("confirm")}
          message={t("confirmSaveBatch")}
          onConfirm={confirmSave}
          onCancel={() => setShowConfirmSave(false)}
        />
      )}
    </div>
  );
}
