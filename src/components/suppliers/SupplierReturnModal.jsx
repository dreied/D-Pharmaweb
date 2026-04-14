// src/components/suppliers/SupplierReturnModal.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";


import {
  SUPPLIER_RETURN_REASONS,
  SUPPLIER_REFUND_METHODS,
} from "../../utils/supplierReturnOptions";

export default function SupplierReturnModal({
  isOpen,
  onClose,
  items = [],
  initialSupplierId = null,
  onCompleted,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState(initialSupplierId || "");
  const [rows, setRows] = useState([]);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reasonMap, setReasonMap] = useState({});
  const [otherReasonMap, setOtherReasonMap] = useState({});


  // Load suppliers
  useEffect(() => {
    async function load() {
      const s = await db.suppliers.toArray();
      setSuppliers(s);
    }
    load();
  }, []);

  // Initialize rows when modal opens
  useEffect(() => {
    if (isOpen) {
      setSupplierId(initialSupplierId ? String(initialSupplierId) : "");

      setRefundMethod("cash");

      const mapped = items.map((it) => ({
        ...it,
        returnQty: 0,
      }));

      setRows(mapped);
      setReasonMap({});
      setOtherReasonMap({});
    }
  }, [isOpen, items, initialSupplierId]);

  if (!isOpen) return null;

  // Calculate total refund
  const totalRefund = rows.reduce((sum, r) => {
    const qty = Number(r.returnQty) || 0;
    return sum + qty * (r.purchasePrice || 0);
  }, 0);

  // Validation
  function validate() {
    if (!supplierId) {
      alert(t("supplier.validation_selectSupplier"));
      return false;
    }

    if (rows.length === 0) {
      alert(t("supplier.validation_noItems"));
      return false;
    }

    for (const r of rows) {
      const qty = Number(r.returnQty) || 0;
      if (qty <= 0 || qty > r.quantity) {
        alert(t("supplier.validation_invalidQuantity"));
        return false;
      }
    }

    return true;
  }

  // Confirm handler
  function handleConfirm() {
    if (!validate()) return;

    const finalReason = rows
      .map((r) => {
        const reasonId = reasonMap[r.batchId];
        if (!reasonId) return "";
        if (reasonId === "other") return otherReasonMap[r.batchId] || "";
        return t(`supplier.returnReason_${reasonId}`);
      })
      .filter(Boolean)
      .join(" | ");

    onCompleted({
      supplierId: Number(supplierId),

      refundMethod,
      items: rows.map((r) => ({
        productId: r.productId,
        batchId: r.batchId,
        batch: r.batch,
        quantity: Number(r.returnQty),
        purchasePrice: r.purchasePrice,
      })),
      totalRefund,
      reason: finalReason,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-3xl p-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* TITLE */}
        <h2 className="text-xl font-bold mb-4 text-primary">
          {t("supplier.returnTitle")}
        </h2>

        {/* SUPPLIER SELECT */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">
            {t("supplier.returnSelectSupplier")}
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">{t("supplier.returnSelectSupplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>

                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* ITEMS TABLE */}
        <div className="overflow-auto max-h-64 mb-4 border rounded">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-high">
              <tr>
                <th className="px-3 py-2">{t("stock.columns.name")}</th>
                <th className="px-3 py-2">{t("stock.batchId")}</th>
                <th className="px-3 py-2">{t("stock.quantity")}</th>
                <th className="px-3 py-2">{t("supplier.returnQuantity")}</th>
                <th className="px-3 py-2">{t("supplier.expiry")}</th>
                <th className="px-3 py-2">{t("supplier.returnReason")}</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.batchId} className="border-b">
                  <td className="px-3 py-2 font-bold text-primary">
                    {isRTL ? r.nameAr : r.nameEn}
                  </td>

                  <td className="px-3 py-2">{r.batch}</td>

                  <td className="px-3 py-2">{r.quantity}</td>

                  {/* RETURN QTY */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      max={r.quantity}
                      className="border rounded px-2 py-1 w-20"
                      value={r.returnQty}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.batchId === r.batchId
                              ? { ...x, returnQty: e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </td>

                  {/* EXPIRY */}
                  <td className="px-3 py-2">
                    {r.expiry
                      ? new Date(r.expiry).toLocaleDateString()
                      : "-"}
                  </td>

                  {/* REASON */}
                  <td className="px-3 py-2">
                    <select
                      className="border rounded px-2 py-1"
                      value={reasonMap[r.batchId] || ""}
                      onChange={(e) =>
                        setReasonMap((prev) => ({
                          ...prev,
                          [r.batchId]: e.target.value,
                        }))
                      }
                    >
                      <option value="">{t("supplier.returnReason")}</option>
                      {SUPPLIER_RETURN_REASONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {t(opt.i18nKey)}
                        </option>
                      ))}
                    </select>

                    {reasonMap[r.batchId] === "other" && (
                      <input
                        className="border rounded px-2 py-1 mt-2 w-full"
                        placeholder={t(
                          "supplier.returnReason_otherPlaceholder"
                        )}
                        value={otherReasonMap[r.batchId] || ""}
                        onChange={(e) =>
                          setOtherReasonMap((prev) => ({
                            ...prev,
                            [r.batchId]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* REFUND METHOD */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">
            {t("supplier.refundMethod")}
          </label>

          <select
            className="w-full border rounded px-3 py-2"
            value={refundMethod}
            onChange={(e) => setRefundMethod(e.target.value)}
          >
            {/* ONLY CASH + CREDIT */}
            {SUPPLIER_REFUND_METHODS.filter(
              (m) => m.id !== "exchange"
            ).map((m) => (
              <option key={m.id} value={m.id}>
                {t(m.i18nKey)}
              </option>
            ))}
          </select>
        </div>

        {/* TOTAL REFUND */}
        <div className="text-lg font-bold text-primary mb-4">
          {t("supplier.totalRefund")}: {totalRefund.toLocaleString("en-US")}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            {t("supplier.cancel")}
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-2 bg-primary text-white rounded hover:opacity-90"
          >
            {t("supplier.confirmReturn")}
          </button>
        </div>
      </div>
    </div>
  );
}
