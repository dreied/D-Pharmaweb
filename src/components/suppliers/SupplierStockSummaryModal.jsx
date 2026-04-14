import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";

export default function SupplierStockSummaryModal({
  items,
  totalCost,
  onBack,
  onConfirm,
  onEdit,
}) {
  const { t } = useTranslation();

  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  const validItems = items.filter(
    (row) =>
      (row.nameEn || row.nameAr) &&
      row.quantity > 0 &&
      row.purchasePrice >= 0
  );

  return (
   <div
  className="fixed inset-0 z-[210] flex items-center justify-center p-4"
  onClick={(e) => e.stopPropagation()}
>

      <div
  className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
  onClick={onBack}
/>

<div
  className="relative z-20 w-full max-w-3xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden"
  onClick={(e) => e.stopPropagation()}
>


        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-on-surface">
            {t("suppliers.stockSummary")}
          </h2>
          <button
            onClick={onBack}
            className="text-on-surface-variant hover:text-error"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-on-surface-variant border-b border-outline-variant/20">
                <th className="py-2">{t("stock.nameEn")}</th>
                <th className="py-2">{t("stock.nameAr")}</th>
                <th className="py-2 text-right">{t("stock.quantity")}</th>
                <th className="py-2 text-right">
                  {t("stock.purchasePrice")}
                </th>
                <th className="py-2 text-right">{t("stock.total")}</th>
                <th className="py-2 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {validItems.map((row, idx) => {
                const lineTotal =
                  Number(row.quantity || 0) *
                  Number(row.purchasePrice || 0);
                const price = fmt(row.purchasePrice || 0);
                const total = fmt(lineTotal);

                return (
                  <tr
                    key={idx}
                    className="border-b border-outline-variant/10 last:border-0"
                  >
                    <td className="py-2">{row.nameEn || "-"}</td>
                    <td className="py-2">{row.nameAr || "-"}</td>
                    <td className="py-2 text-right">
                      {row.quantity || 0}
                    </td>
                    <td className="py-2 text-right">
                      {price.formatted} {price.symbol}
                    </td>
                    <td className="py-2 text-right font-bold">
                      {total.formatted} {total.symbol}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onEdit(idx)}
                        className="text-primary font-bold hover:underline"
                      >
                        {t("common.edit")}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {validItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-on-surface-variant"
                  >
                    {t("suppliers.noItemsInSummary")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-outline-variant/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-on-surface-variant">
            {t("suppliers.totalStockCost")}:{" "}
            {fmt(totalCost).formatted} {fmt(totalCost).symbol}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high"
            >
              {t("common.back")}
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:opacity-90"
            >
              {t("suppliers.continueToPayment")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
