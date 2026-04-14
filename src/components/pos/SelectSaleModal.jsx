import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { formatPrice } from "../../currency";

export default function SelectSaleModal({ list, onSelect, onClose }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // ⭐ Search inside modal (customer name + sale number)
  const [search, setSearch] = useState("");

  // ⭐ Sort newest first + filter by search
  const filtered = useMemo(() => {
    return list
      .filter(({ sale, customerName }) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;

        return (
          sale.id.toString().includes(term) ||
          customerName?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.sale.date) - new Date(a.sale.date));
  }, [list, search]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-5xl border border-outline-variant/30 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/20 flex justify-between items-center">
          <h2 className="text-xl font-bold text-on-surface">
            {t("returns.selectCustomerToReturn")}
          </h2>

          {/* Search box */}
          <input
            type="text"
            placeholder={t("returns.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              px-4 py-2 rounded-xl bg-surface-container-high 
              border border-outline-variant focus:ring-2 
              focus:ring-primary/40 transition w-64
            "
            style={{ textAlign: isRTL ? "right" : "left" }}
          />
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead
              className="bg-surface-container-high border-b border-outline-variant/20 sticky top-0 z-10"
            >
              <tr className="text-on-surface-variant">
                <th className="px-4 py-3">{t("returns.paymentMethod")}</th>
                <th className="px-4 py-3">{t("returns.customer")}</th>
                <th className="px-4 py-3">{t("returns.product")}</th>
                <th className="px-4 py-3">{t("returns.date")}</th>
                <th className="px-4 py-3">{t("returns.sale")}</th>
                <th className="px-4 py-3">{t("returns.items")}</th>
                <th className="px-4 py-3">{t("returns.total")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(({ sale, items, product, customerName, saleDate }) => {
                const qty = items.reduce((s, i) => s + i.quantity, 0);
                const total = formatPrice(sale.total, false, "SYP");

                // ⭐ Full row color based on payment method
                const rowColor =
                  sale.paymentMethod === "cash"
                    ? "bg-green-50 hover:bg-green-100"
                    : "bg-blue-50 hover:bg-blue-100";

                return (
                  <tr
                    key={sale.id}
                    onClick={() => onSelect(sale.id)}
                    className={`
                      border-b border-outline-variant/10 
                      cursor-pointer transition
                      ${rowColor}
                    `}
                  >
                    {/* Payment Method */}
                    <td className="px-4 py-3 font-bold text-primary">
                      {sale.paymentMethod === "cash"
                        ? t("returns.cashSale")
                        : t("returns.debtSale")}
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">{customerName}</td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      {product.nameAr} / {product.nameEn}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      {saleDate.slice(0, 10)}
                    </td>

                    {/* Sale ID */}
                    <td className="px-4 py-3 font-semibold">#{sale.id}</td>

                    {/* Items */}
                    <td className="px-4 py-3">{qty}</td>

                    {/* Total */}
                    <td className="px-4 py-3 font-bold text-primary">
                      {total.formatted} {total.symbol}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/20 flex justify-end">
          <button
            onClick={onClose}
            className="
              px-6 py-2 rounded-xl 
              bg-surface-container-high 
              text-on-surface 
              hover:bg-surface-container 
              font-semibold
            "
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
