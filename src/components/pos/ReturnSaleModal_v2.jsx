// src/components/pos/ReturnSaleModal_v2.jsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";
import { formatPrice } from "../../currency";
import { processSaleReturn_v2 } from "../../services/returns/salesReturn_v2";
import { buildSalesReturnPayload } from "../../services/returns/salesReturnAdapter";
import i18n from "../../i18n";

export default function ReturnSaleModal_v2({ saleId, onClose }) {
  const { t } = useTranslation();
  const lang = i18n.language;

  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load sale + saleItems + product names + customer if debt
  useEffect(() => {
    async function load() {
      const s = await db.sales.get(saleId);

      let customerObj = null;
      if (s.paymentMethod === "debt" && s.customerId) {
        customerObj = await db.customers.get(s.customerId);
      }

      const saleItems = await db.saleItems.where("saleId").equals(saleId).toArray();

      const enriched = [];
      for (const it of saleItems) {
        const alreadyReturned = it.returnedQty || 0;
        const product = await db.stockProducts.get(it.productId);

        enriched.push({
          ...it,
          maxReturnable: it.quantity - alreadyReturned,
          nameAr: product?.nameAr || "",
          nameEn: product?.nameEn || "",
        });
      }

      setSale(s);
      setCustomer(customerObj);
      setItems(enriched);

      const initial = {};
      enriched.forEach((it) => (initial[it.id] = 0));
      setReturnQuantities(initial);

      // If sale was debt → default refund method = debt
      if (s.paymentMethod === "debt") {
        setRefundMethod("debt");
      }

      setLoading(false);
    }
    load();
  }, [saleId]);

  function updateQty(itemId, qty, max) {
    setReturnQuantities((prev) => ({
      ...prev,
      [itemId]: Math.min(max, Math.max(0, qty)),
    }));
  }

  const totalRefund = items.reduce((sum, it) => {
    const qty = returnQuantities[it.id] || 0;
    return sum + qty * it.price;
  }, 0);

  async function submitReturn() {
    const allZero = Object.values(returnQuantities).every((qty) => qty === 0);

    if (allZero) {
      setWarning(t("returns.mustSelectQty"));
      return;
    }

    setWarning("");

    const rows = items.map((it) => ({
      saleItemId: it.id,
      returnQty: returnQuantities[it.id],
    }));

    const payload = buildSalesReturnPayload({
      saleId,
      rows,
      note: reason === "other" ? otherReason : reason,
      customerReturnLabel: t("customer.return"),
      extraRefundLabel: t("customer.extraRefund"),
      refundMethod,
    });

    await processSaleReturn_v2(payload);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl">
          {t("returns.loading")}
        </div>
      </div>
    );
  }

  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest w-[750px] max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6 border border-outline">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {t("returns.returnForInvoice")} #{saleId}
          </h2>

          <button onClick={onClose} className="text-outline hover:text-primary transition">
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

        {/* Sale Info */}
        <div className="mb-4 text-sm text-outline">
          <div>{t("returns.date")}: {sale.date.slice(0, 10)}</div>

          <div>
            {t("returns.paymentMethod")}:{" "}
            {sale.paymentMethod === "cash" ? t("pos.cash") : t("pos.debt")}
          </div>

          {sale.paymentMethod === "debt" && customer && (
            <div>
              {t("returns.customerName")}: {customer.name}
            </div>
          )}
        </div>

        {/* Table */}
        <table className="w-full text-sm border border-outline-variant rounded-lg overflow-hidden">
          <thead className="bg-surface-container-high text-outline">
            <tr>
              <th className="p-2">{t("returns.product")}</th>
              <th className="p-2">{t("returns.batch")}</th>
              <th className="p-2">{t("returns.soldQty")}</th>
              <th className="p-2">{t("returns.maxReturnable")}</th>
              <th className="p-2">{t("returns.price")}</th>
              <th className="p-2">{t("returns.returnQty")}</th>
              <th className="p-2">{t("returns.total")}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it) => {
              const qty = returnQuantities[it.id] || 0;
              const lineTotal = qty * it.price;
              const displayName =
                lang === "ar" ? it.nameAr || it.nameEn : it.nameEn || it.nameAr;

              return (
                <tr key={it.id} className="border-t border-outline-variant">
                  <td className="p-2">{displayName}</td>
                  <td className="p-2">{it.batchNumber}</td>
                  <td className="p-2">{it.quantity}</td>
                  <td className="p-2">{it.maxReturnable}</td>
                  <td className="p-2">{formatPrice(it.price, false, "SYP").formatted}</td>

                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      max={it.maxReturnable}
                      value={qty}
                      onChange={(e) =>
                        updateQty(it.id, Number(e.target.value), it.maxReturnable)
                      }
                      className="w-20 px-2 py-1 rounded-lg border border-outline"
                    />
                  </td>

                  <td className="p-2 font-bold">
                    {formatPrice(lineTotal, false, "SYP").formatted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Reason */}
        <div className="mt-6">
          <h3 className="font-bold mb-2">{t("returns.reason")}</h3>

          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 rounded-lg border border-outline"
          >
            <option value="">{t("returns.selectReason")}</option>
            <option value="expired">{t("returns.expired")}</option>
            <option value="damaged">{t("returns.damaged")}</option>
            <option value="wrong">{t("returns.wrongItem")}</option>
            <option value="other">{t("returns.other")}</option>
          </select>

          {reason === "other" && (
            <input
              type="text"
              placeholder={t("returns.enterReason")}
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              className="w-full mt-2 p-2 rounded-lg border border-outline"
            />
          )}
        </div>

        {/* Refund Method */}
        <div className="mt-6 p-4 rounded-xl bg-surface-container-high border border-outline">
          <h3 className="font-bold mb-2">{t("returns.refundMethod")}</h3>

          {sale.paymentMethod === "cash" ? (
            <div className="text-primary font-semibold">
              {t("returns.refundCashOnly")}
            </div>
          ) : (
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="cash"
                  checked={refundMethod === "cash"}
                  onChange={() => setRefundMethod("cash")}
                />
                {t("pos.cash")}
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="debt"
                  checked={refundMethod === "debt"}
                  onChange={() => setRefundMethod("debt")}
                />
                {t("pos.debt")}
              </label>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="mt-6 p-4 rounded-xl bg-surface-container-high border border-outline text-lg font-bold flex justify-between">
          <span>{t("returns.totalRefund")}</span>
          <span>{formatPrice(totalRefund, false, "SYP").formatted}</span>
        </div>

        {/* Warning */}
        {warning && (
          <div className="mt-4 text-red-500 font-semibold text-sm">
            {warning}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            disabled={submitting}
            onClick={async () => {
              const allZero = Object.values(returnQuantities).every((qty) => qty === 0);

              if (allZero) {
                setWarning(t("returns.mustSelectQty"));
                return;
              }

              setWarning("");
              setSubmitting(true);

              try {
                await submitReturn();
                alert(t("returns.success"));
                onClose();
              } catch (err) {
                console.error(err);
                alert(t("returns.errorProcessing"));
              }

              setSubmitting(false);
            }}
            className="px-6 py-3 rounded-xl font-semibold bg-primary text-on-primary hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t("returns.processing") : t("returns.submitReturn")}
          </button>
        </div>
      </div>
    </div>
  );
}
