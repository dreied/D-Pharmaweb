// src/pages/SalesHistory.jsx
import React, { useState, useContext, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../db/index";
import { loadPharmacySettings } from "../services/pdfDataLoader";
import pdfMake from "../pdfFonts";

import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import { formatPrice } from "../currency";
import { ThemeContext } from "../App";
import { useNavigate } from "react-router-dom";

import SelectSaleModal from "../components/pos/SelectSaleModal";
import ReturnSaleModal from "../components/pos/ReturnSaleModal_v2";
import { findSalesByBarcode } from "../services/saleResolver";

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
      const matchesSearch =
        searchTerm.trim() === "" ||
        sale.id.toString().includes(searchTerm.trim());

      const matchesDate =
        dateFilter === "" || sale.date.slice(0, 10) === dateFilter;

      return matchesSearch && matchesDate;
    });
  }, [salesWithItems, searchTerm, dateFilter]);

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

  const handlePrintSale = (sale) => {
  const printContent = document.getElementById(`sale-${sale.id}`);
  const WinPrint = window.open('', '', 'width=900,height=650');

  WinPrint.document.write(printContent.innerHTML);
  WinPrint.document.close();
  WinPrint.focus();
  WinPrint.print();
  WinPrint.close();
};

async function generateSalePDF(sale, mode = "download") {
  const isArabic = i18n.language === "ar";

  // Load pharmacy info
  const { pharmacyName, pharmacyLogo } = await loadPharmacySettings();

  // Prepare items
  const itemsBody = [
    isArabic
      ? [
          reshapeArabic("الإجمالي"),
          reshapeArabic("السعر"),
          reshapeArabic("الكمية"),
          reshapeArabic("المنتج")
        ]
      : ["Total", "Price", "Qty", "Item"],
    ...sale.items.map((it) => {
      const lineTotal = it.price * it.quantity;
      return isArabic
        ? [
            reshapeArabic(lineTotal.toString()),
            reshapeArabic(it.price.toString()),
            reshapeArabic(it.quantity.toString()),
            reshapeArabic(it.productName)
          ]
        : [
            lineTotal.toString(),
            it.price.toString(),
            it.quantity.toString(),
            it.productName
          ];
    })
  ];

  // PDF definition
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    pageDirection: isArabic ? "rtl" : "ltr",
    defaultStyle: {
      font: "Noto",
      fontSize: 12,
      alignment: isArabic ? "right" : "left"
    },
    content: [
      {
        columns: [
          pharmacyLogo
            ? {
                image: pharmacyLogo,
                width: 80,
                alignment: isArabic ? "left" : "right"
              }
            : {},
          {
            text: isArabic ? reshapeArabic(pharmacyName) : pharmacyName,
            style: "title",
            alignment: "center",
            margin: [0, 20, 0, 0]
          }
        ]
      },

      {
        text: isArabic ? reshapeArabic("فاتورة بيع") : "Sales Invoice",
        style: "header",
        alignment: "center",
        margin: [0, 20, 0, 20]
      },

      {
        columns: [
          {
            text:
              (isArabic ? reshapeArabic("رقم الفاتورة") : "Invoice ID") +
              ": " +
              sale.id,
            margin: [0, 0, 0, 5]
          },
          {
            text:
              (isArabic ? reshapeArabic("التاريخ") : "Date") +
              ": " +
              sale.date.slice(0, 16),
            alignment: isArabic ? "left" : "right"
          }
        ]
      },

      {
        text:
          (isArabic ? reshapeArabic("طريقة الدفع") : "Payment") +
          ": " +
          (sale.paymentMethod === "cash"
            ? isArabic
              ? reshapeArabic("نقداً")
              : "Cash"
            : isArabic
            ? reshapeArabic("دين")
            : "Debt"),
        margin: [0, 0, 0, 20]
      },

      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "*"],
          body: itemsBody
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? "#eeeeee" : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5
        }
      },

      {
        text:
          (isArabic ? reshapeArabic("الإجمالي") : "Total") +
          ": " +
          formatPrice(sale.total, false, "SYP").formatted,
        style: "total",
        alignment: isArabic ? "left" : "right",
        margin: [0, 20, 0, 0]
      }
    ],

    styles: {
      title: { fontSize: 20, bold: true },
      header: { fontSize: 16, bold: true },
      total: { fontSize: 16, bold: true }
    }
  };

  const pdf = pdfMake.createPdf(docDefinition);

  if (mode === "download") {
    pdf.download(isArabic ? "فاتورة.pdf" : "invoice.pdf");
  }

  if (mode === "print") {
    pdf.getBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const win = window.open(url);

      win.onload = () => {
        win.print();
      };
    });
  }
}



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
            {t("pos.clearFilters")}
          </button>

          <button
            onClick={handleBarcodeReturnScan}
            className="p-3 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 transition flex items-center justify-center"
            title={t("returns.scanToReturn")}
          >
            <span className="material-symbols-outlined text-xl">
              barcode_scanner
            </span>
          </button>
        </div>

        {/* Grouped Sales */}
        <div className="space-y-4">
          {groupedByMonth.length === 0 && (
            <div className="text-center py-6 text-outline-variant">
              {t("pos.noSalesFound")}
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
                  {expandedMonthKey === month.key ? "expand_less" : "expand_more"}
                </span>
              </button>

              {expandedMonthKey === month.key && (
                <div className="border-t border-outline-variant">
                  {month.days.map((day) => (
                    <div key={day.key} className="border-b border-outline-variant">
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
                                  {t("pos.invoiceId")}
                                </th>
                                <th className="px-4 py-3">{t("pos.date")}</th>
                                <th className="px-4 py-3">{t("pos.customer")}</th>
                                <th className="px-4 py-3">
                                  {t("pos.paymentMethod")}
                                </th>
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
                                    {/* MAIN ROW */}
                                    <tr
                                      className="border-t border-outline-variant hover:bg-surface-container-low transition cursor-pointer"
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
                                          className="px-3 py-1 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90"
                                        >
                                          {t("returns.returnItems")}
                                        </button>
                                      </td>
                                    </tr>

                                    {/* EXPANDED ROW */}
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
                                              {sale.items?.map((it) => {
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
                                                      {it.productName ||
                                                        it.productId}
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
                                                {t("pos.total")}:{" "}
                                                {formattedTotal}
                                              </p>

   <button
  onClick={(e) => {
    e.stopPropagation();
    generateSalePDF(sale, "print");
  }}
>
  <span className="material-symbols-outlined cursor-pointer hover:text-primary/70">
    print
  </span>
</button>



{/* Export PDF icon */}
<button
  onClick={(e) => {
    e.stopPropagation();
    generateSalePDF(sale, "download");
  }}
>
  <span className="material-symbols-outlined cursor-pointer hover:text-primary/70">
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
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

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

        {/* Hidden print container */}
        <div id="print-invoice" style={{ display: "none" }} />

      </main>
    </div>
  );
}
