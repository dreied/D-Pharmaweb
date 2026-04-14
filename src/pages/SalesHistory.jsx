// src/pages/SalesHistory.jsx
import React, { useState, useContext, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db/index";
import html2pdf from "html2pdf.js";

import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import { formatPrice } from "../currency";
import { ThemeContext } from "../App";
import { useNavigate } from "react-router-dom";

import SelectSaleModal from "../components/pos/SelectSaleModal";
import ReturnSaleModal from "../components/pos/ReturnSaleModal_v2";
import { findSalesByBarcode } from "../services/saleResolver";
import { loadPharmacySettings } from "../services/pdfDataLoader";

export default function SalesHistory() {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const today = new Date();
  const todayDayKey = today.toISOString().slice(0, 10);
  const todayMonthKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const [expandedMonthKey, setExpandedMonthKey] = useState(todayMonthKey);
  const [expandedDayKey, setExpandedDayKey] = useState(todayDayKey);
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const [returnSaleId, setReturnSaleId] = useState(null);
  const [showSelectSaleModal, setShowSelectSaleModal] = useState(false);
  const [saleSelectionList, setSaleSelectionList] = useState([]);

  // Pharmacy settings
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyLogo, setPharmacyLogo] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      const { pharmacyName, pharmacyLogo } = await loadPharmacySettings();
      setPharmacyName(pharmacyName);
      setPharmacyLogo(pharmacyLogo);
    }
    loadSettings();
  }, []);

  function reshapeArabic(text) {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u0652]/g, "")
      .split(" ")
      .reverse()
      .join(" ");
  }

  // Load sales + items
  const salesWithItems =
    useLiveQuery(async () => {
      const rawSales = await db.sales.toArray();
      rawSales.sort((a, b) => new Date(b.date) - new Date(a.date));

      const all = [];
      for (const sale of rawSales) {
        const items = await db.saleItems
          .where("saleId")
          .equals(sale.id)
          .toArray();

        for (const it of items) {
          const p = await db.stockProducts.get(it.productId);
          it.productName = p?.nameAr || p?.nameEn || `#${it.productId}`;
        }

        all.push({ ...sale, items });
      }

      return all;
    }, [], []) || [];

  const customers = useLiveQuery(() => db.customers.toArray(), [], []) || [];

  function getCustomerName(customerId, paymentMethod) {
    if (paymentMethod === "cash") return "-";
    if (!customerId) return "-";
    const c = customers.find((x) => x.id === customerId);
    return c ? c.name : "-";
  }

  // Scan barcode → return workflow
  async function handleBarcodeReturnScan() {
    const barcode = prompt(t("returns.scanPrompt"));
    if (!barcode) return;

    let matches = await findSalesByBarcode(barcode);
    matches = matches.filter(
      (m) => m && m.sale && m.items && Array.isArray(m.items)
    );

    if (matches.length === 0) {
      alert(t("returns.noSaleFound"));
      return;
    }

    if (matches.length === 1) {
      setReturnSaleId(matches[0].sale.id);
      return;
    }

    setSaleSelectionList(matches);
    setShowSelectSaleModal(true);
  }

  const filteredSales = useMemo(() => {
  return salesWithItems.filter((sale) => {
    const term = searchTerm.trim().toLowerCase();

    const matchesSearch =
      term === "" ||
      sale.id.toString().includes(term) ||
      sale.items.some((it) =>
        (it.productName || "").toLowerCase().includes(term)
      ) ||
      getCustomerName(sale.customerId, sale.paymentMethod)
        .toLowerCase()
        .includes(term);

    const matchesDate =
      dateFilter === "" || sale.date.slice(0, 10) === dateFilter;

    return matchesSearch && matchesDate;
  });
}, [salesWithItems, searchTerm, dateFilter]);

useEffect(() => {
  const term = searchTerm.trim();
  if (term === "") return;

  // افتح كل الشهور التي تحتوي على نتائج
  const monthsToOpen = new Set();
  const daysToOpen = new Set();
  const salesToOpen = new Set();

  filteredSales.forEach((sale) => {
    const dayKey = sale.date.slice(0, 10);
    const monthKey = sale.date.slice(0, 7);

    monthsToOpen.add(monthKey);
    daysToOpen.add(dayKey);
    salesToOpen.add(sale.id);
  });

  // افتح كل الشهور
  if (monthsToOpen.size > 0) {
    // افتح أول شهر فقط (UI يسمح بواحد)
    setExpandedMonthKey([...monthsToOpen][0]);
  }

  // افتح أول يوم فقط (UI يسمح بواحد)
  if (daysToOpen.size > 0) {
    setExpandedDayKey([...daysToOpen][0]);
  }

  // افتح كل الفواتير داخل اليوم المفتوح
  if (salesToOpen.size > 0) {
    // افتح أول فاتورة فقط (UI يسمح بواحدة)
    setExpandedSaleId([...salesToOpen][0]);
  }
}, [filteredSales, searchTerm]);


  // Group by month → day
  const groupedByMonth = useMemo(() => {
    const map = {};

    for (const sale of filteredSales) {
      const d = new Date(sale.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const dayKey = sale.date.slice(0, 10);

      if (!map[monthKey]) {
        map[monthKey] = {
          key: monthKey,
          label: d.toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "long"
          }),
          days: {}
        };
      }

      if (!map[monthKey].days[dayKey]) {
        map[monthKey].days[dayKey] = {
          key: dayKey,
          label: d.toLocaleDateString(i18n.language, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          }),
          sales: []
        };
      }

      map[monthKey].days[dayKey].sales.push(sale);
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
  }, [filteredSales, i18n.language]);

  function toggleMonth(key) {
    setExpandedMonthKey(expandedMonthKey === key ? null : key);
    setExpandedDayKey(null);
    setExpandedSaleId(null);
  }

  function toggleDay(key) {
    setExpandedDayKey(expandedDayKey === key ? null : key);
    setExpandedSaleId(null);
  }

  function toggleSale(id) {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  }

  // html2pdf generator
  async function generateSalePDF(sale, mode = "download") {
    const element = document.getElementById(`pdf-sale-${sale.id}`);
console.log("PDF element:", element);
console.log("InnerHTML:", element?.innerHTML);

    const opt = {
      margin: 10,
      filename: i18n.language === "ar" ? "فاتورة.pdf" : "invoice.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    if (mode === "download") {
      html2pdf().set(opt).from(element).save();
    }

    if (mode === "print") {
      html2pdf()
        .set(opt)
        .from(element)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          const blob = pdf.output("bloburl");
          const win = window.open(blob);
          win.onload = () => win.print();
        });
    }
  }

  // -------------------------
  // RETURN STARTS HERE
  // -------------------------
return (
  <div className="bg-background text-on-background antialiased overflow-hidden">
    <TopAppBar />
    <SideNavBar />

    <main className="ml-64 pt-16 px-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-6 text-primary font-bold hover:underline"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        {t("back")}
      </button>

      <h1 className="text-3xl font-bold mb-6">{t("pos.salesHistory")}</h1>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <input
  type="text"
  placeholder={t("pos.searchInvoice")}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline w-80"
 />


        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-3 rounded-xl bg-surface-container-lowest border border-outline"
        />

        <button
          onClick={() => {
            setSearchTerm("");
            setDateFilter("");
          }}
          className="px-4 py-3 rounded-xl bg-primary text-on-primary"
        >
          {t("pos.clearFilters")}
        </button>

       <button
  onClick={handleBarcodeReturnScan}
  className="flex items-center gap-1 text-green-600"
  style={{ padding: 0, background: "none", border: "none" }}
>
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "32px", lineHeight: 1 }}
  >
    undo
  </span>

  <span
    className="material-symbols-outlined"
    style={{ fontSize: "36px", lineHeight: 1 }}
  >
    barcode_scanner
  </span>
</button>


      </div>

      {/* Grouped Sales */}
      <div className="space-y-4">
        {groupedByMonth.map((month) => (
          <div
            key={month.key}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm"
          >
            <button
              onClick={() => toggleMonth(month.key)}
              className="w-full flex justify-between items-center px-4 py-3 bg-surface-container-high"
            >
              <span className="font-bold">{month.label}</span>
              <span className="material-symbols-outlined">
                {expandedMonthKey === month.key ? "expand_less" : "expand_more"}
              </span>
            </button>

            {expandedMonthKey === month.key && (
              <div className="border-t border-outline-variant">
                {month.days.map((day) => (
                  <div key={day.key} className="border-b border-outline-variant">
                    <button
                      onClick={() => toggleDay(day.key)}
                      className="w-full flex justify-between items-center px-4 py-3 bg-surface-container-low"
                    >
                      <span className="font-semibold">{day.label}</span>
                      <span className="material-symbols-outlined">
                        {expandedDayKey === day.key
                          ? "expand_less"
                          : "expand_more"}
                      </span>
                    </button>

                    {expandedDayKey === day.key && (
                      <>
                        {/* TABLE */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left bg-surface-container-lowest">
                            <thead className="bg-surface-container-high">
                              <tr>
                                <th className="px-4 py-3">{t("pos.invoiceId")}</th>
                                <th className="px-4 py-3">{t("pos.date")}</th>
                                <th className="px-4 py-3">{t("pos.customer")}</th>
                                <th className="px-4 py-3">{t("pos.paymentMethod")}</th>
                                <th className="px-4 py-3">{t("pos.total")}</th>
                                <th className="px-4 py-3">{t("pos.actions")}</th>
                              </tr>
                            </thead>

                            <tbody>
                              {day.sales.map((sale) => {
                                const formattedTotal = formatPrice(
                                  sale.total,
                                  false,
                                  "SYP"
                                ).formatted;

                                return (
                                  <React.Fragment key={sale.id}>
                                    <tr
                                      className="border-t border-outline-variant hover:bg-surface-container-low cursor-pointer"
                                      onClick={() => toggleSale(sale.id)}
                                    >
                                      <td className="px-4 py-3 font-semibold">
                                        {sale.id}
                                      </td>
                                      <td className="px-4 py-3">
                                        {sale.date.slice(0, 10)}
                                      </td>
                                      <td className="px-4 py-3">
                                        {getCustomerName(
                                          sale.customerId,
                                          sale.paymentMethod
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        {sale.paymentMethod === "cash"
                                          ? t("pos.cash")
                                          : t("pos.debt")}
                                      </td>
                                      <td className="px-4 py-3 font-bold">
                                        {formattedTotal}
                                      </td>

                                      <td className="px-4 py-3">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setReturnSaleId(sale.id);
                                          }}
                                          className="px-3 py-1 rounded-lg bg-primary text-on-primary text-sm font-semibold"
                                        >
                                          {t("returns.returnItems")}
                                        </button>
                                      </td>
                                    </tr>

                                    {expandedSaleId === sale.id && (
                                      <tr className="bg-surface-container-lowest border-b border-outline-variant">
                                        <td colSpan="6" className="p-6">
                                          <h3 className="text-lg font-bold mb-3">
                                            {t("pos.items")}
                                          </h3>

                                          <table className="w-full mb-4">
                                            <thead>
                                              <tr className="text-sm text-outline">
                                                <th className="py-2">
                                                  {t("pos.item")}
                                                </th>
                                                <th className="py-2">
                                                  {t("pos.qty")}
                                                </th>
                                                <th className="py-2">
                                                  {t("pos.price")}
                                                </th>
                                                <th className="py-2">
                                                  {t("pos.total")}
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody>
                                              {sale.items.map((it) => {
                                                const lineTotal =
                                                  it.price * it.quantity;
                                                const formattedLine =
                                                  formatPrice(
                                                    lineTotal,
                                                    false,
                                                    "SYP"
                                                  ).formatted;

                                                return (
                                                  <tr
                                                    key={it.id}
                                                    className="border-t border-outline-variant"
                                                  >
                                                    <td className="py-2">
                                                      {it.productName}
                                                    </td>
                                                    <td className="py-2">
                                                      {it.quantity}
                                                    </td>
                                                    <td className="py-2">
                                                      {it.price}
                                                    </td>
                                                    <td className="py-2 font-semibold">
                                                      {formattedLine}
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
                                                  {t("pos.paymentMethod")}:
                                                </strong>{" "}
                                                {sale.paymentMethod === "cash"
                                                  ? t("pos.cash")
                                                  : `${t("pos.debt")} → ${getCustomerName(
                                                      sale.customerId,
                                                      sale.paymentMethod
                                                    )}`}
                                              </p>

                                              <p className="text-sm">
                                                <strong>{t("pos.date")}:</strong>{" "}
                                                {sale.date}
                                              </p>
                                            </div>

                                            <div className="text-right">
                                              <p className="text-lg font-bold">
                                                {t("pos.total")}: {formattedTotal}
                                              </p>

                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  generateSalePDF(sale, "print");
                                                }}
                                              >
                                                <span className="material-symbols-outlined hover:text-primary/70">
                                                  print
                                                </span>
                                              </button>

                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  generateSalePDF(sale, "download");
                                                }}
                                              >
                                                <span className="material-symbols-outlined hover:text-primary/70">
                                                  picture_as_pdf
                                                </span>
                                              </button>
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

                        {/* ⭐ PDF TEMPLATES — OUTSIDE TABLE, INSIDE SALE LOOP */}
                        {day.sales.map((sale) => {
                          const isArabic = i18n.language === "ar";

                          return (
                            <div
  id={`pdf-sale-${sale.id}`}
  style={{
    visibility: "hidden",
    position: "absolute",
    left: "-9999px",
    top: "-9999px",
    padding: "20px",
    direction: isArabic ? "rtl" : "ltr",
    fontFamily: "sans-serif",
  }}
>

                              <div
                                style={{
                                  textAlign: "center",
                                  marginBottom: "20px",
                                }}
                              >
                                {pharmacyLogo && (
                                  <img
                                    src={pharmacyLogo}
                                    alt="logo"
                                    style={{
                                      width: "80px",
                                      marginBottom: "10px",
                                    }}
                                  />
                                )}
                                <h2>
                                  {isArabic
                                    ? reshapeArabic(pharmacyName)
                                    : pharmacyName}
                                </h2>
                                <h3>
                                  {isArabic
                                    ? reshapeArabic("فاتورة بيع")
                                    : "Sales Invoice"}
                                </h3>
                              </div>

                              <div style={{ marginBottom: "10px" }}>
                                <strong>
                                  {isArabic
                                    ? reshapeArabic("رقم الفاتورة")
                                    : "Invoice ID"}
                                  :
                                </strong>{" "}
                                {sale.id}
                              </div>

                              <div style={{ marginBottom: "10px" }}>
                                <strong>
                                  {isArabic
                                    ? reshapeArabic("التاريخ")
                                    : "Date"}
                                  :
                                </strong>{" "}
                                {sale.date.slice(0, 16)}
                              </div>

                              <div style={{ marginBottom: "20px" }}>
                                <strong>
                                  {isArabic
                                    ? reshapeArabic("طريقة الدفع")
                                    : "Payment"}
                                  :
                                </strong>{" "}
                                {sale.paymentMethod === "cash"
                                  ? isArabic
                                    ? reshapeArabic("نقداً")
                                    : "Cash"
                                  : isArabic
                                  ? reshapeArabic("دين")
                                  : "Debt"}
                              </div>

                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "14px",
                                }}
                              >
                                <thead>
                                  <tr style={{ background: "#eee" }}>
                                    <th
                                      style={{
                                        border: "1px solid #ccc",
                                        padding: "6px",
                                      }}
                                    >
                                      {isArabic
                                        ? reshapeArabic("المنتج")
                                        : "Item"}
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #ccc",
                                        padding: "6px",
                                      }}
                                    >
                                      {isArabic
                                        ? reshapeArabic("الكمية")
                                        : "Qty"}
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #ccc",
                                        padding: "6px",
                                      }}
                                    >
                                      {isArabic
                                        ? reshapeArabic("السعر")
                                        : "Price"}
                                    </th>
                                    <th
                                      style={{
                                        border: "1px solid #ccc",
                                        padding: "6px",
                                      }}
                                    >
                                      {isArabic
                                        ? reshapeArabic("الإجمالي")
                                        : "Total"}
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {sale.items.map((it) => (
                                    <tr key={it.id}>
                                      <td
                                        style={{
                                          border: "1px solid #ccc",
                                          padding: "6px",
                                        }}
                                      >
                                        {isArabic
                                          ? reshapeArabic(it.productName)
                                          : it.productName}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #ccc",
                                          padding: "6px",
                                        }}
                                      >
                                        {it.quantity}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #ccc",
                                          padding: "6px",
                                        }}
                                      >
                                        {it.price}
                                      </td>
                                      <td
                                        style={{
                                          border: "1px solid #ccc",
                                          padding: "6px",
                                        }}
                                      >
                                        {it.price * it.quantity}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <h3
                                style={{
                                  marginTop: "20px",
                                  textAlign: isArabic ? "left" : "right",
                                }}
                              >
                                {isArabic
                                  ? reshapeArabic("الإجمالي")
                                  : "Total"}
                                :
                                {
                                  formatPrice(
                                    sale.total,
                                    false,
                                    "SYP"
                                  ).formatted
                                }
                              </h3>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      {showSelectSaleModal && (
        <SelectSaleModal
          list={saleSelectionList}
          onSelect={(id) => {
            setShowSelectSaleModal(false);
            setReturnSaleId(id);
          }}
          onClose={() => setShowSelectSaleModal(false)}
        />
      )}

      {returnSaleId && (
        <ReturnSaleModal
          saleId={returnSaleId}
          onClose={() => setReturnSaleId(null)}
        />
      )}

      <div id="print-invoice" style={{ display: "none" }} />
    </main>
  </div>
);

}
