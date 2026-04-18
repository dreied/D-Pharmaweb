import { useTranslation } from "react-i18next";
import { formatPrice } from "../../currency";
import React, { useState, useEffect } from "react";

import { db } from "../../db";
import { useAuth } from "../../context/AuthContext";

export default function StockTable({
  displayedItems,
  expandedProductId,
  toggleExpand,
  navigate,
  i18n,
  useNewCurrency,
  currencySymbol,
  onSelectReturnItems,
  onReturnSingleBatch,
  onShowLocationInMap,
}) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const isRTL = i18n.language === "ar";

  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [batchesByProduct, setBatchesByProduct] = useState({});

  // Load batches when a product expands
  useEffect(() => {
    async function loadBatches(productId) {
      if (!productId) return;
      const b = await db.stockBatches
        .where("stockProductId")
        .equals(productId)
        .toArray();

      setBatchesByProduct((prev) => ({ ...prev, [productId]: b }));
    }

    if (expandedProductId) loadBatches(expandedProductId);
  }, [expandedProductId]);

  function renderLocationCompact(cabinet, shelf, row) {
    const c = cabinet || "";
    const s = shelf || "";
    const r = row || "";
    return [c, s, r].filter(Boolean).join("-") || "-";
  }

  function buildBatchObject(product, batch) {
    return {
      productId: product.id,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      batchId: batch.id,
      batch: batch.batch,
      quantity: batch.quantity,
      purchasePrice: batch.purchasePrice,
      expiry: batch.expiry,
      supplierId: batch.supplierId,
    };
  }

  // Notify parent when selection changes
  useEffect(() => {
    const selectedItems = [];

    displayedItems.forEach((item) => {
      const p = item.product;
      const batches = batchesByProduct[p.id] || [];

      batches.forEach((b) => {
        if (selectedBatchIds.includes(b.id)) {
          selectedItems.push(buildBatchObject(p, b));
        }
      });
    });

    onSelectReturnItems(selectedItems);
  }, [selectedBatchIds, batchesByProduct, displayedItems]);

  return (
    <table className="min-w-full border-collapse">
      <thead className="sticky top-0 z-50 bg-white dark:bg-slate-900 shadow">
        <tr className="text-xs uppercase text-on-surface-variant border-b">
          <th className="px-6 py-3"></th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.columns.name")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.columns.location")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.columns.expiry")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.columns.qty")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.purchasePrice")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.salePrice")}
          </th>
          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t("stock.columns.actions")}
          </th>
        </tr>
      </thead>

      <tbody>
        {displayedItems.map((item) => {
          const p = item.product;
          const totalQty = item.totalQty || 0;

          const status =
            totalQty === 0
              ? "outOfStock"
              : p.minQty != null && totalQty <= p.minQty
              ? "lowStock"
              : "inStock";

          const expiryText = item.expiry
            ? new Date(item.expiry).toLocaleDateString()
            : "-";

          return (
            <React.Fragment key={p.id}>
              {/* MAIN PRODUCT ROW */}
              <tr
                key={p.id}
                className="hover:bg-primary-container/10 transition-colors cursor-pointer"
              >
                <td className="px-6 py-5">
                  <div className="px-6 py-5 flex items-center gap-2">
                    {/* Expand button */}
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="text-primary hover:scale-110 transition-transform"
                    >
                      <span className="material-symbols-outlined">
                        {expandedProductId === p.id
                          ? "expand_less"
                          : "expand_more"}
                      </span>
                    </button>

                    {/* Select all batches */}
                    <input
                      type="checkbox"
                      checked={
                        (batchesByProduct[p.id] || []).length > 0 &&
                        (batchesByProduct[p.id] || []).every((b) =>
                          selectedBatchIds.includes(b.id)
                        )
                      }
                      onChange={(e) => {
                        const batches = batchesByProduct[p.id] || [];
                        if (e.target.checked) {
                          setSelectedBatchIds((prev) => [
                            ...new Set([
                              ...prev,
                              ...batches.map((b) => b.id),
                            ]),
                          ]);
                        } else {
                          setSelectedBatchIds((prev) =>
                            prev.filter(
                              (id) => !batches.map((b) => b.id).includes(id)
                            )
                          );
                        }
                      }}
                    />
                  </div>
                </td>

                {/* NAME */}
                <td
                  className={`px-6 py-5 ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-container/30 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">
                        medication
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-primary-dim font-headline">
                        {isRTL ? p.nameAr : p.nameEn}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-label">
                        {p.form || ""}
                      </div>
                    </div>
                  </div>
                </td>

                {/* LOCATION */}
<td
  className={`px-6 py-5 text-sm ${
    isRTL ? "text-right" : "text-left"
  }`}
>
  <button
    type="button"
    className="bg-surface-container-high px-2 py-1 rounded font-mono text-xs font-bold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
    onClick={() => {
      if (onShowLocationInMap) {
        onShowLocationInMap(p);
      }
    }}
  >
    {renderLocationCompact(p.cabinet, p.shelf, p.shelfRow)}
  </button>
</td>


                {/* EXPIRY */}
                <td
                  className={`px-6 py-5 text-sm ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  {expiryText}
                </td>

                {/* QUANTITY */}
                <td
                  className={`px-6 py-5 ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-on-surface">
                      {totalQty.toLocaleString("en-US")}
                    </span>

                    {status === "outOfStock" && (
                      <span className="mt-1 inline-block text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                        {t("stock.outOfStock")}
                      </span>
                    )}

                    {status === "lowStock" && (
                      <span className="mt-1 inline-block text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                        {t("stock.lowStock")}
                      </span>
                    )}

                    {status === "inStock" && (
                      <span className="mt-1 inline-block text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                        {t("stock.inStock")}
                      </span>
                    )}
                  </div>
                </td>

                {/* PURCHASE PRICE */}
                <td
                  className={`px-6 py-5 text-secondary font-bold ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  {(() => {
                    const { formatted, symbol } = formatPrice(
                      p.purchasePrice || 0,
                      useNewCurrency,
                      currencySymbol
                    );
                    return `${formatted} ${symbol}`;
                  })()}
                </td>

                {/* SALE PRICE */}
                <td
                  className={`px-6 py-5 text-primary font-bold ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  {(() => {
                    const { formatted, symbol } = formatPrice(
                      p.salePrice || 0,
                      useNewCurrency,
                      currencySymbol
                    );
                    return `${formatted} ${symbol}`;
                  })()}
                </td>

                {/* ACTIONS */}
                <td
                  className={`px-6 py-5 ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                >
                  {/* EDIT PRODUCT — Admin only */}
                  {isAdmin && (
                    <button
                      onClick={() => navigate(`/edit-product/${p.id}`)}
                      className="text-primary flex items-center"
                    >
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                    </button>
                  )}
                </td>
              </tr>

              {/* EXPANDED BATCHES */}
              {expandedProductId === p.id && (
                <tr>
                  <td colSpan={8} className="bg-surface-container-low px-6 py-4">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="text-on-surface-variant border-b">
                          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("stock.batchId")}
                          </th>
                          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("stock.expiryDate")}
                          </th>
                          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("stock.quantity")}
                          </th>
                          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("stock.purchasePrice")}
                          </th>
                          <th className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                            {t("stock.salePrice")}
                          </th>
                          <th></th>
                        </tr>
                      </thead>

                      <tbody>
                        {(batchesByProduct[p.id] || []).map((b) => (
                          <tr key={b.id} className="border-b">
                            <td className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedBatchIds.includes(b.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBatchIds((prev) => [
                                        ...prev,
                                        b.id,
                                      ]);
                                    } else {
                                      setSelectedBatchIds((prev) =>
                                        prev.filter((id) => id !== b.id)
                                      );
                                    }
                                  }}
                                />
                                {b.batch}
                              </div>
                            </td>

                            <td className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                              {b.expiry
                                ? new Date(b.expiry).toLocaleDateString()
                                : "-"}
                            </td>

                            <td className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                              {b.quantity}
                            </td>

                            <td
                              className={`px-6 py-3 text-secondary font-bold ${
                                isRTL ? "text-right" : "text-left"
                              }`}
                            >
                              {(() => {
                                const { formatted, symbol } = formatPrice(
                                  b.purchasePrice || 0,
                                  useNewCurrency,
                                  currencySymbol
                                );
                                return `${formatted} ${symbol}`;
                              })()}
                            </td>

                            <td
                              className={`px-6 py-3 text-primary font-bold ${
                                isRTL ? "text-right" : "text-left"
                              }`}
                            >
                              {(() => {
                                const { formatted, symbol } = formatPrice(
                                  b.salePrice || 0,
                                  useNewCurrency,
                                  currencySymbol
                                );
                                return `${formatted} ${symbol}`;
                              })()}
                            </td>

                            {/* RETURN ICON */}
                            <td className={`px-6 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                              <button
                                className="text-primary hover:text-primary/70"
                                onClick={() => onReturnSingleBatch(p, b)}
                                title={t("supplier.returnButton")}
                              >
                                <span className="material-symbols-outlined text-lg">
                                  keyboard_return
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
