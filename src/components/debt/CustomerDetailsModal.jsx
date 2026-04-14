import React, { useEffect, useState } from "react";
import { db } from "../../db";
import { useTranslation } from "react-i18next";
import { formatPrice } from "../../currency";

export default function CustomerDetailsModal({ open, onClose, customer }) {
  const { t, i18n } = useTranslation();


  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customerRecord, setCustomerRecord] = useState(customer);

  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);

  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const isRTL = i18n.language === "ar";

  useEffect(() => {
    if (!customer) return;

    async function load() {
      const [
        salesRaw,
        paymentsRaw,
        symbolSetting,
        newCurrencySetting,
        freshCustomer
      ] = await Promise.all([
        db.sales.where("customerId").equals(customer.id).toArray(),
        db.customerPayments.where("customerId").equals(customer.id).toArray(),
        db.appSettings.get("currency_symbol"),
        db.appSettings.get("use_new_currency"),
        db.customers.get(customer.id)
      ]);

      const salesWithItems = [];
      for (const sale of salesRaw) {
        const items = await db.saleItems.where("saleId").equals(sale.id).toArray();

        const itemsWithNames = [];
        for (const it of items) {
          const p = await db.stockProducts.get(it.productId);
          itemsWithNames.push({
            ...it,
            productNameAr: p?.nameAr || "-",
            productNameEn: p?.nameEn || "-"
          });
        }

        salesWithItems.push({
          ...sale,
          items: itemsWithNames
        });
      }

      // Paid during sale entries
      const paidDuringSaleEntries = salesWithItems
        .filter((s) => s.paidNow && s.paidNow > 0)
        .map((s) => ({
          id: `sale-paid-${s.id}`,
          amount: s.paidNow,
          date: s.date,
          type: "paid_during_sale"
        }));

      setPurchases(
        salesWithItems.sort((a, b) => new Date(b.date) - new Date(a.date))
      );

      setPayments(
        [...paymentsRaw, ...paidDuringSaleEntries].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        )
      );

      setCurrencySymbol(symbolSetting?.value || "SYP");
      setUseNewCurrency(newCurrencySetting?.value === true);
      setCustomerRecord(freshCustomer || customer);
    }

    load();
  }, [customer]);

  function formatDate(d) {
    return new Date(d).toLocaleDateString(
      isRTL ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "2-digit" }
    );
  }

  if (!open || !customerRecord) return null;

  // ----------------- AGGREGATES -----------------

  const initialDebtValue = customerRecord.initialBalance || 0;

  const totalDebtCreatedBySales = purchases.reduce(
    (sum, s) => sum + (s.total - (s.paidNow || 0)),
    0
  );

  const totalPaidDuringSalesValue = purchases.reduce(
    (sum, s) => sum + (s.paidNow || 0),
    0
  );

  const totalPaymentsValue = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const totalRefundsValue = payments
    .filter((p) => p.type === "return" || p.type === "extra_refund")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const totalPurchasesValue = purchases.reduce((sum, s) => sum + s.total, 0);

  const currentBalanceValue = customerRecord.balance || 0;

  // ----------------- PAST BALANCE (CORRECT) -----------------

  const events = [
    ...purchases.map((s) => ({
      type: "sale",
      date: s.date,
      effect: s.total - (s.paidNow || 0)
    })),
    ...payments.map((p) => ({
      type: p.type,
      date: p.date,
      effect:
        p.type === "payment"
          ? -Math.abs(p.amount)
          : p.type === "return"
          ? -Math.abs(p.amount)
          : p.type === "extra_refund"
          ? -Math.abs(p.amount)
          : 0
    }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const lastEvent = events[events.length - 1];

  const pastBalanceValue =
    lastEvent ? currentBalanceValue - lastEvent.effect : currentBalanceValue;

  // ----------------- FORMATTED -----------------

  const initialDebt = formatPrice(initialDebtValue, useNewCurrency, currencySymbol);
  const pastBalance = formatPrice(pastBalanceValue, useNewCurrency, currencySymbol);
  const totalPurchases = formatPrice(totalPurchasesValue, useNewCurrency, currencySymbol);
  const totalPaidDuringSales = formatPrice(totalPaidDuringSalesValue, useNewCurrency, currencySymbol);
  const totalPayments = formatPrice(totalPaymentsValue, useNewCurrency, currencySymbol);
  const totalRefunds = formatPrice(totalRefundsValue, useNewCurrency, currencySymbol);
  const remainingBalance = formatPrice(currentBalanceValue, useNewCurrency, currencySymbol);

  const remainingColor =
    currentBalanceValue > 0
      ? "text-error font-extrabold"
      : "text-green-600 font-extrabold";

  // ----------------- BALANCE TIMELINE -----------------

  const timeline = [
    {
      label: t("customer.initialDebt"),
      value: initialDebt.formatted + " " + initialDebt.symbol,
      color: "text-red-600"
    },
    {
      label: t("customer.pastBalance"),
      value: pastBalance.formatted + " " + pastBalance.symbol,
      color: "text-blue-700"
    },
    {
      label: t("customer.remainingBalance"),
      value: remainingBalance.formatted + " " + remainingBalance.symbol,
      color: remainingColor
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <div className="bg-surface-container-highest p-6 rounded-2xl shadow-xl w-[650px] max-h-[90vh] overflow-y-auto border border-outline-variant">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {t("customer.details")} – {customerRecord.name}
          </h2>

          <button
            onClick={onClose}
            className="material-symbols-outlined text-xl text-on-surface"
          >
            close
          </button>
        </div>

        {/* Customer Info */}
        <div className="mb-6 space-y-1">
          <p className="text-sm text-on-surface-variant">
            {t("customer.phone")}: {customerRecord.phone || "-"}
          </p>
        </div>

        {/* Financial Summary */}
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant mb-6">
          <h3 className="text-lg font-bold mb-3">{t("customer.financialSummary")}</h3>

          <div className="space-y-2 text-sm">

            <div className="flex justify-between">
              <span>{t("customer.initialDebt")}:</span>
              <span className="font-bold text-red-600">
                -{initialDebt.formatted} {initialDebt.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t("customer.pastBalance")}:</span>
              <span className="font-bold text-blue-700">
                {pastBalance.formatted} {pastBalance.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t("customer.totalPurchases")}:</span>
              <span className="font-bold text-red-600">
                -{totalPurchases.formatted} {totalPurchases.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t("customer.paidDuringSales")}:</span>
              <span className="font-bold text-green-600">
                +{totalPaidDuringSales.formatted} {totalPaidDuringSales.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t("customer.totalPaid")}:</span>
              <span className="font-bold text-green-600">
                +{totalPayments.formatted} {totalPayments.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span>{t("customer.totalRefundCost")}:</span>
              <span className="font-bold text-blue-600">
                +{totalRefunds.formatted} {totalRefunds.symbol}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t border-outline-variant">
              <span>{t("customer.remainingBalance")}:</span>
              <span className={remainingColor}>
                {remainingBalance.formatted} {remainingBalance.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Timeline */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 bg-purple-50 p-2 rounded-lg">
            {t("customer.balanceTimeline")}
          </h3>

          <div className="space-y-2">
            {timeline.map((row, idx) => (
              <div
                key={idx}
                className="flex justify-between p-2 rounded-lg border border-outline-variant bg-surface-container-low"
              >
                <span className="text-on-surface-variant">{row.label}</span>
                <span className={`font-bold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Purchases */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 bg-blue-50 p-2 rounded-lg">
            {t("customer.purchases")}
          </h3>

          {purchases.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              {t("customer.noPurchases")}
            </p>
          )}

          {purchases.map((sale) => {
            const fp = formatPrice(sale.total, useNewCurrency, currencySymbol);
            const isExpanded = expandedSaleId === sale.id;

            return (
              <div
                key={sale.id}
                className="rounded-xl border border-blue-200 bg-blue-100/40 mb-3 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedSaleId(isExpanded ? null : sale.id)
                  }
                  className="w-full flex justify-between items-center px-4 py-3"
                >
                  <div>
                    <p className="font-bold">{fp.formatted} {fp.symbol}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDate(sale.date)} — #{sale.id}
                    </p>
                  </div>

                  <span className="material-symbols-outlined">
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                </button>

               {isExpanded && (
  <div className="px-4 pb-3 pt-2 border-t border-blue-200 bg-blue-50">

    {sale.items.length > 0 ? (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-blue-200 text-on-surface font-bold">
            <th className="p-2 border border-blue-300">
              {isRTL ? "اسم المادة" : "Item"}
            </th>
            <th className="p-2 border border-blue-300">
              {isRTL ? "الكمية" : "Qty"}
            </th>
            <th className="p-2 border border-blue-300">
              {isRTL ? "السعر" : "Price"}
            </th>
            <th className="p-2 border border-blue-300">
              {isRTL ? "الإجمالي" : "Total"}
            </th>
          </tr>
        </thead>

        <tbody>
          {sale.items.map((item) => {
            const itemPrice = formatPrice(
              item.price,
              useNewCurrency,
              currencySymbol
            );
           /* const computedTotal = item.quantity * item.price;
const itemTotal = formatPrice(computedTotal, useNewCurrency, currencySymbol);*/
const itemTotal = formatPrice(item.total, useNewCurrency, currencySymbol);


            return (
              <tr key={item.id} className="bg-blue-100">
                <td className="p-2 border border-blue-200">
                  {isRTL ? item.productNameAr : item.productNameEn}
                </td>
                <td className="p-2 border border-blue-200 text-center">
                  {item.quantity}
                </td>
                <td className="p-2 border border-blue-200 text-center">
                  {itemPrice.formatted} {itemPrice.symbol}
                </td>
                <td className="p-2 border border-blue-200 text-center font-bold">
  {itemTotal.formatted} {itemTotal.symbol}
</td>

              </tr>
            );
          })}
        </tbody>
      </table>
    ) : (
      <p className="text-xs text-on-surface-variant">
        {t("customer.noItems")}
      </p>
    )}

  </div>
)}

              </div>
            );
          })}
        </div>

        {/* Payments */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2 bg-emerald-50 p-2 rounded-lg">
            {t("customer.payments")}
          </h3>

          {payments.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              {t("customer.noPayments")}
            </p>
          )}

          {payments.map((p) => {
            const abs = Math.abs(p.amount);
            const fp = formatPrice(abs, useNewCurrency, currencySymbol);

            let sign = "";
            if (p.type === "payment") sign = "+";
            if (p.type === "paid_during_sale") sign = "+";
            if (p.type === "return") sign = "+";
            if (p.type === "sale") sign = "-";

            const bgColor =
              p.type === "extra_refund"
                ? "bg-orange-100 border-orange-300 text-orange-700"
                : p.type === "return"
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : p.type === "payment" || p.type === "paid_during_sale"
                ? "bg-green-100 border-green-300 text-green-700"
                : "bg-red-100 border-red-300 text-red-700";

            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg mb-2 border ${bgColor}`}
              >
                <p className="font-bold">
                  {sign}{fp.formatted} {fp.symbol}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {formatDate(p.date)} –{" "}
                  {p.type === "initial"
                    ? t("customer.initialDebt")
                    : p.type === "paid_during_sale"
                    ? t("customer.paidDuringSales")
                    : t(`customer.${p.type}`)}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
