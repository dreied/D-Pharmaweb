// src/pages/SupplierReturnHistory.jsx
import React, { useState, useContext, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { db } from "../db";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import { formatPrice } from "../currency";
import { ThemeContext } from "../App";

export default function SupplierReturnHistory() {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const isRTL = i18n.language === "ar";

  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const today = new Date();
  const todayDayKey = today.toISOString().slice(0, 10);
  const todayMonthKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [expandedMonthKey, setExpandedMonthKey] = useState(todayMonthKey);
  const [expandedDayKey, setExpandedDayKey] = useState(todayDayKey);
  const [expandedReturnId, setExpandedReturnId] = useState(null);

  // -----------------------------
  // SAFE DATE HELPERS
  // -----------------------------
  function safeDate(d) {
    if (!d) return "";
    if (typeof d === "string") return d.slice(0, 10);
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return "";
  }

  function safeDateTime(d) {
    if (!d) return "";
    if (typeof d === "string") return d;
    if (d instanceof Date) return d.toISOString();
    return "";
  }

  // -----------------------------
  // LOAD SUPPLIERS
  // -----------------------------
  const suppliers =
    useLiveQuery(() => db.suppliers.toArray(), [], []) || [];

  function getSupplierName(id) {
    const s = suppliers.find((x) => x.id === id);
    return s ? s.name : t("supplier.unknownSupplier");
  }

  // -----------------------------
  // LOAD RETURNS + ITEMS
  // -----------------------------
  const returnsWithItems =
    useLiveQuery(
      async () => {
        const rawReturns = await db.supplierReturns.toArray();

        rawReturns.sort((a, b) => new Date(b.date) - new Date(a.date));

        const all = [];
        for (const r of rawReturns) {
          const items = await db.supplierReturnItems
            .where("supplierReturnId")
            .equals(r.id)
            .toArray();

          for (const it of items) {
            const p = await db.stockProducts.get(it.productId);
            it.productName = p?.nameAr || p?.nameEn || `#${it.productId}`;
          }

          all.push({ ...r, items });
        }

        return all;
      },
      [],
      []
    ) || [];

  // -----------------------------
  // FILTERS
  // -----------------------------
  const filteredReturns = useMemo(() => {
    return returnsWithItems.filter((r) => {
      const matchesSearch =
        searchTerm.trim() === "" ||
        r.id.toString().includes(searchTerm.trim());

      const dateKey = safeDate(r.date);
      const matchesDate = dateFilter === "" || dateKey === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [returnsWithItems, searchTerm, dateFilter]);

  // -----------------------------
  // GROUP BY MONTH → DAY
  // -----------------------------
  const groupedByMonth = useMemo(() => {
    const map = {};

    for (const r of filteredReturns) {
      const d = new Date(
        typeof r.date === "string" ? r.date : r.date.toISOString()
      );

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      const dayKey = safeDate(r.date);

      if (!map[monthKey]) {
        map[monthKey] = {
          key: monthKey,
          label: d.toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "long",
          }),
          days: {},
        };
      }

      if (!map[monthKey].days[dayKey]) {
        map[monthKey].days[dayKey] = {
          key: dayKey,
          label: d.toLocaleDateString(i18n.language, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          }),
          returns: [],
        };
      }

      map[monthKey].days[dayKey].returns.push(r);
    }

    const months = Object.values(map).sort((a, b) =>
      a.key < b.key ? 1 : -1
    );

    for (const month of months) {
      month.days = Object.values(month.days).sort((a, b) =>
        a.key < b.key ? 1 : -1
      );
    }

    return months;
  }, [filteredReturns, i18n.language]);

  // -----------------------------
  // TOGGLES
  // -----------------------------
  function toggleMonth(key) {
    setExpandedMonthKey(expandedMonthKey === key ? null : key);
    setExpandedDayKey(null);
    setExpandedReturnId(null);
  }

  function toggleDay(key) {
    setExpandedDayKey(expandedDayKey === key ? null : key);
    setExpandedReturnId(null);
  }

  function toggleReturn(id) {
    setExpandedReturnId(expandedReturnId === id ? null : id);
  }

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div
      className="bg-background text-on-background antialiased overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <TopAppBar />
      <SideNavBar />

      <main className="ml-64 pt-16 px-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 text-primary font-bold hover:underline"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t("back")}
        </button>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-6">
          {t("supplier.returnHistoryTitle")}
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <input
            type="text"
            placeholder={t("supplier.searchReturnInvoice")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline focus:ring-2 focus:ring-primary/30 transition-all"
          />

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline focus:ring-2 focus:ring-primary/30 transition-all"
          />

          <button
            onClick={() => {
              setSearchTerm("");
              setDateFilter("");
            }}
            className="px-4 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition"
          >
            {t("supplier.clearFilters")}
          </button>
        </div>

        {/* Grouped Returns */}
        <div className="space-y-4">
          {groupedByMonth.length === 0 && (
            <div className="text-center py-6 text-outline-variant">
              {t("supplier.noReturnsFound")}
            </div>
          )}

          {groupedByMonth.map((month) => (
            <div
              key={month.key}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
            >
              {/* Month header */}
              <button
                onClick={() => toggleMonth(month.key)}
                className="w-full flex justify-between items-center px-4 py-3 bg-surface-container-high hover:bg-surface-container-high/80 transition rounded-t-xl"
              >
                <span className="font-bold">{month.label}</span>
                <span className="material-symbols-outlined">
                  {expandedMonthKey === month.key
                    ? "expand_less"
                    : "expand_more"}
                </span>
              </button>

              {expandedMonthKey === month.key && (
                <div className="border-t border-outline-variant">
                  {month.days.map((day) => (
                    <div
                      key={day.key}
                      className="border-b border-outline-variant"
                    >
                      {/* Day header */}
                      <button
                        onClick={() => toggleDay(day.key)}
                        className="w-full flex justify-between items-center px-4 py-3 bg-surface-container-low hover:bg-surface-container-low/80 transition"
                      >
                        <span className="font-semibold">{day.label}</span>
                        <span className="material-symbols-outlined">
                          {expandedDayKey === day.key
                            ? "expand_less"
                            : "expand_more"}
                        </span>
                      </button>

                      {expandedDayKey === day.key && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left bg-surface-container-lowest">
                            <thead className="bg-surface-container-high">
                              <tr>
                                <th className="px-4 py-3">
                                  {t("supplier.returnId")}
                                </th>
                                <th className="px-4 py-3">
                                  {t("supplier.returnDate")}
                                </th>
                                <th className="px-4 py-3">
                                  {t("supplier.returnSupplier")}
                                </th>
                                <th className="px-4 py-3">
                                  {t("supplier.returnAmount")}
                                </th>
                                <th className="px-4 py-3">
                                  {t("supplier.actions")}
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {day.returns.map((r) => {
                                const { formatted, symbol } = formatPrice(
                                  r.totalAmount,
                                  useNewCurrency,
                                  currencySymbol
                                );

                                return (
                                  <React.Fragment key={r.id}>
                                    {/* MAIN ROW */}
                                    <tr
                                      className="border-t border-outline-variant hover:bg-surface-container-low transition cursor-pointer"
                                      onClick={() => toggleReturn(r.id)}
                                    >
                                      <td className="px-4 py-3 font-semibold">
                                        {r.id}
                                      </td>
                                      <td className="px-4 py-3">
                                        {safeDate(r.date)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {getSupplierName(r.supplierId)}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-red-600">
                                        {formatted} {symbol}
                                      </td>
                                      <td className="px-4 py-3 flex items-center gap-3 text-primary">
  {/* Print icon */}
 {/* Print icon */}
<span
  className="material-symbols-outlined cursor-pointer hover:text-primary/70"
  title={t("supplier.print")}
  
>
  print
</span>

{/* Export PDF icon */}
<span
  className="material-symbols-outlined cursor-pointer hover:text-primary/70"
  title={t("supplier.exportPdf")}

>
  picture_as_pdf
</span>

</td>

                                    </tr>

                                    {/* EXPANDED ROW */}
                                    {expandedReturnId === r.id && (
                                      <tr className="bg-surface-container-lowest border-b border-outline-variant">
                                        <td colSpan="5" className="p-6">
                                          <h3 className="text-lg font-bold mb-3">
                                            {t("supplier.returnedItems")}
                                          </h3>

                                          <table className="w-full mb-4">
                                            <thead>
                                              <tr className="text-sm text-outline">
                                                <th className="py-2">
                                                  {t("supplier.product")}
                                                </th>
                                                <th className="py-2">
                                                  {t("supplier.qty")}
                                                </th>
                                                <th className="py-2">
                                                  {t("supplier.amount")}
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody>
                                              {r.items?.map((it) => {
                                                const {
                                                  formatted: lineFormatted,
                                                  symbol: lineSymbol,
                                                } = formatPrice(
                                                  it.amount,
                                                  useNewCurrency,
                                                  currencySymbol
                                                );

                                                return (
                                                  <tr
                                                    key={it.id}
                                                    className="border-t border-outline-variant"
                                                  >
                                                    <td className="py-2">
                                                      {it.productName ||
                                                        it.productId}
                                                    </td>
                                                    <td className="py-2">
                                                      {it.quantity}
                                                    </td>
                                                    <td className="py-2 font-semibold">
                                                      {lineFormatted}{" "}
                                                      {lineSymbol}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>

                                          <div className="flex justify-between items-center mt-4">
                                            <div>
                                              <p className="text-sm">
                                                <strong>
                                                  {t("supplier.returnDate")}:
                                                </strong>{" "}
                                                {safeDateTime(r.date)}
                                              </p>

                                              <p className="text-sm">
                                                <strong>
                                                  {t("supplier.returnSupplier")}:
                                                </strong>{" "}
                                                {getSupplierName(r.supplierId)}
                                              </p>
                                            </div>

                                            <div className="text-right">
                                              <p className="text-lg font-bold text-red-600">
                                                {t("supplier.returnAmount")}:{" "}
                                                {formatted} {symbol}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
