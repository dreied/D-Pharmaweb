import React, { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import { ThemeContext } from "../App";
import { formatPrice } from "../currency";
import pdfMake from "../pdfFonts";



import SettlePaymentModal from "../components/debt/SettlePaymentModal";
import CustomerDetailsModal from "../components/debt/CustomerDetailsModal";
import ConfirmModal from "../components/modals/ConfirmModal";
import DebtTable from "../components/debt/DebtTable";
import InsightCardGrid from "../components/debt/InsightCardGrid";
import AddCustomerModal from "../components/debt/AddCustomerModal";

import TopAppBar from "../components/TopAppBar";
import SideNavBar from "../components/SideNavBar";

import { useAppSettings } from "../useAppSettings";

// ⭐ Correct Vite-compatible imports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function DebtBook() {
  const { t, i18n } = useTranslation();
  const { theme } = useContext(ThemeContext);

  const [customers, setCustomers] = useState([]);

  // Currency settings
  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);

  const [page, setPage] = useState(1);
  const pageSize = 4;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  const [totalDebt, setTotalDebt] = useState(0);
  const [debtChangePercent, setDebtChangePercent] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState(null);

  const [tableFilter, setTableFilter] = useState(null);

  const [pharmacyName, setPharmacyName] = useState("");
  const [logo, setLogo] = useState(null);

  function openSettleModal(customer) {
    setSelectedCustomer(customer);
    setSettleModalOpen(true);
  }

  function openDetails(customer) {
    setDetailsCustomer(customer);
    setDetailsOpen(true);
  }

  // -----------------------------
  // LOAD DATA FROM DEXIE
  // -----------------------------
  async function load() {
    const [customersRaw, salesRaw] = await Promise.all([
      db.customers.toArray(),
      db.sales.toArray()
    ]);

    const now = new Date();

    const customersEnriched = customersRaw.map((c, index) => {
      const customerSales = salesRaw
        .filter((s) => s.customerId === c.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const lastSale = customerSales[0] || null;
      const lastDate = lastSale ? new Date(lastSale.date) : null;

      let overdueDays = 0;
      if (lastDate) {
        overdueDays = Math.floor(
          (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }

      let statusKey = "debtBook.status.withinTerm";
      let statusTone = "normal";

      if (!lastSale) {
        statusKey = "debtBook.status.noPurchases";
        statusTone = "normal";
      } else if (overdueDays > 30) {
        statusKey = "debtBook.status.over30";
        statusTone = "danger";
      } else if (overdueDays > 15) {
        statusKey = "debtBook.status.over15";
        statusTone = "warning";
      }

      const paymentHistoryPattern = customerSales
        .slice(0, 4)
        .map((sale) => {
          const d = new Date(sale.date);
          const diffDays = Math.floor(
            (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
          );
          return diffDays > 30 ? "overdue" : "normal";
        });

      while (paymentHistoryPattern.length < 4) {
        paymentHistoryPattern.push("neutral");
      }

      const initials = c.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const avatarTone =
        index % 3 === 0 ? "tertiary" : index % 3 === 1 ? "secondary" : "outline";

      const lastPurchaseDateDisplay = lastDate
        ? new Date(lastDate).toLocaleDateString(
            "en-US", // ⭐ Latin numbers always
            { year: "numeric", month: "short", day: "2-digit" }
          )
        : "";

      const fp = formatPrice(c.balance || 0, useNewCurrency, currencySymbol);

      return {
        id: c.id,
        name: c.name,
        totalDebt: c.balance || 0,
        totalDebtDisplay: `${fp.formatted} ${fp.symbol}`,
        initials,
        lastPurchaseDateDisplay,
        statusKey,
        statusTone,
        avatarTone,
        paymentHistoryPattern
      };
    });

    setCustomers(customersEnriched);

    const total = customersRaw.reduce((sum, c) => sum + (c.balance || 0), 0);
    setTotalDebt(total);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const lastMonthTotal = customersRaw
      .filter((c) => c.lastUpdated && new Date(c.lastUpdated) < oneMonthAgo)
      .reduce((sum, c) => sum + (c.balance || 0), 0);

    let change = 0;
    if (lastMonthTotal > 0) {
      change = ((total - lastMonthTotal) / lastMonthTotal) * 100;
    }

    setDebtChangePercent(change);

    const critical = customersEnriched.filter(
      (c) => c.statusKey === "debtBook.status.over30"
    ).length;
    setCriticalCount(critical);

    setTableFilter(null);
  }

  useEffect(() => {
    load();
  }, [i18n.language, useNewCurrency, currencySymbol]);

  useEffect(() => {
    async function loadSettings() {
      const nameSetting = await db.appSettings.get("pharmacy_name");
      const logoSetting = await db.appSettings.get("pharmacy_logo");

      setPharmacyName(nameSetting?.value || "");
      setLogo(logoSetting?.value || null);
    }

    loadSettings();
  }, []);

  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  // -----------------------------
  // SEARCH + FILTER + SORT
  // -----------------------------
  let filtered = [...customers];

  if (tableFilter === "overdue") {
    filtered = filtered.filter(
      (c) => c.statusKey === "debtBook.status.over30"
    );
  }

  if (tableFilter === "recent") {
    filtered = filtered.filter((c) => {
      const last = c.lastPurchaseDateDisplay;
      if (!last) return false;
      const diff = (Date.now() - new Date(last)) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
  }

  const term = search.trim().toLowerCase();
  if (term) {
    filtered = filtered.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(term);
      const lastMatch = (c.lastPurchaseDateDisplay || "")
        .toLowerCase()
        .includes(term);
      const debtMatch = c.totalDebtDisplay.toLowerCase().includes(term);
      return nameMatch || lastMatch || debtMatch;
    });
  }

  if (sortBy === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "debt") {
    filtered.sort((a, b) => b.totalDebt - a.totalDebt);
  } else if (sortBy === "lastPurchase") {
    filtered.sort((a, b) => {
      const da = a.lastPurchaseDateDisplay
        ? new Date(a.lastPurchaseDateDisplay)
        : 0;
      const db = b.lastPurchaseDateDisplay
        ? new Date(b.lastPurchaseDateDisplay)
        : 0;
      return db - da;
    });
  }

  const totalItems = filtered.length;

  // -----------------------------
  // INSIGHT CARDS
  // -----------------------------
  function buildInsightCards() {
    const cards = [];

    cards.push({
      icon: "warning",
      tone: "error",
      titleKey: "debtBook.cards.criticalArrears.title",
      descriptionKey: "",
      descriptionValues: {
        dual: true,
        count: criticalCount,
        onOverdue: () => {
          setTableFilter("overdue");
          setSortBy("debt");
          window.scrollTo({ top: 600, behavior: "smooth" });
        },
        onHighestDebt: () => {
          setTableFilter(null);
          setSortBy("debt");
          window.scrollTo({ top: 600, behavior: "smooth" });
        }
      }
    });

    const recentPayments = customers.filter((c) => {
      const last = c.lastPurchaseDateDisplay;
      if (!last) return false;
      const diff = (Date.now() - new Date(last)) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    cards.push({
      icon: "payments",
      tone: "secondary",
      titleKey: "debtBook.cards.recentSettlements.title",
      descriptionKey: "debtBook.cards.recentSettlements.description",
      descriptionValues: { count: recentPayments },
      onClick: () => {
        setTableFilter("recent");
        setSortBy("lastPurchase");
        window.scrollTo({ top: 600, behavior: "smooth" });
      }
    });

    return cards;
  }

  const cards = buildInsightCards();

  function handleDeleteCustomer(customer) {
    if ((customer.totalDebt || 0) !== 0) {
      alert(t("debtBook.cannotDeleteHasDebt"));
      return;
    }

    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    await db.customers.delete(customerToDelete.id);
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
    load();
  }

  function cancelDelete() {
    setDeleteModalOpen(false);
    setCustomerToDelete(null);
  }

  const totalFp = formatPrice(totalDebt, useNewCurrency, currencySymbol);

  // -----------------------------
  // GROUPED EXPORT DATA
  // -----------------------------
  async function buildGroupedData() {
    const [customersRaw, salesRaw, paymentsRaw] = await Promise.all([
      db.customers.toArray(),
      db.sales.toArray(),
      db.customerPayments.toArray()
    ]);

    const grouped = [];

    for (const c of customersRaw) {
      const initialDebtValue = c.initialBalance || 0;
      const currentBalanceValue = c.balance || 0;

      const initialDebtFormatted = formatPrice(
        initialDebtValue,
        useNewCurrency,
        currencySymbol
      );
      const currentBalanceFormatted = formatPrice(
        currentBalanceValue,
        useNewCurrency,
        currencySymbol
      );

      const customerSales = salesRaw
        .filter((s) => s.customerId === c.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const customerPayments = paymentsRaw
        .filter((p) => p.customerId === c.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const transactions = [];

      for (const s of customerSales) {
        const fp = formatPrice(s.total, useNewCurrency, currencySymbol);
        const dateDisplay = new Date(s.date).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "short", day: "2-digit" }
        );

        transactions.push({
          type: i18n.language === "ar" ? "عملية شراء" : t("debtBook.kindPurchase"),

          date: dateDisplay,
          amount: `${fp.formatted} ${fp.symbol}`.replace(/\s+/g, " ")

        });
      }

      for (const p of customerPayments) {
        const abs = Math.abs(p.amount);
        const fp = formatPrice(abs, useNewCurrency, currencySymbol);
        const dateDisplay = new Date(p.date).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "short", day: "2-digit" }
        );

        transactions.push({
         type: i18n.language === "ar" ? "دفعة" : t("debtBook.kindPayment")
,
          date: dateDisplay,
          amount: `${fp.formatted} ${fp.symbol}`.replace(/\s+/g, " ")

        });
      }

      grouped.push({
        name: c.name,
        initialDebt: `${initialDebtFormatted.formatted} ${initialDebtFormatted.symbol}`,
        currentBalance: `${currentBalanceFormatted.formatted} ${currentBalanceFormatted.symbol}`,
        transactions
      });
    }

    return grouped;
  }
function reshapeArabic(text) {
  if (!text) return "";
  return text
    .replace(/[\u064B-\u0652]/g, "") // remove diacritics
    .split(" ")
    .reverse()
    .join(" ");
}

  // -----------------------------
  // PRINT ALL CUSTOMERS
  // -----------------------------
  async function handlePrintAll() {
    const grouped = await buildGroupedData();

    const printWindow = window.open("", "_blank");
    const today = new Date().toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    );

    printWindow.document.write(`
      <html>
      <head>
        <title>${pharmacyName} - ${t("debtBook.printTitle")}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; direction: ${dir}; }
          h1, h2, h3 { margin: 0; padding: 0; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 120px; margin-bottom: 10px; }
          .customer-block { margin-bottom: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #444; padding: 8px; font-size: 13px; }
          th { background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logo ? `<img class="logo" src="${logo}" />` : ""}
          <h1>${pharmacyName}</h1>
          <h2>${t("debtBook.printTitle")}</h2>
          <div>${today}</div>
        </div>
    `);

    grouped.forEach((c) => {
      printWindow.document.write(`
        <div class="customer-block">
          <h2>${c.name}</h2>
          <div>${t("customer.initialDebt")}: <strong>${c.initialDebt}</strong></div>
          <div>${t("customer.currentBalance")}: <strong>${c.currentBalance}</strong></div>

          <table>
            <thead>
              <tr>
                <th>${t("debtBook.kind")}</th>
                <th>${t("debtBook.date")}</th>
                <th>${t("debtBook.amount")}</th>
              </tr>
            </thead>
            <tbody>
      `);

      c.transactions.forEach((tRow) => {
        printWindow.document.write(`
          <tr>
            <td>${tRow.type}</td>
            <td>${tRow.date}</td>
            <td>${tRow.amount}</td>
          </tr>
        `);
      });

      printWindow.document.write(`
            </tbody>
          </table>
        </div>
      `);
    });

    printWindow.document.write(`</body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  // -----------------------------
  // EXPORT PDF
  // -----------------------------
async function handleExportPDF() {
  const grouped = await buildGroupedData();
  const isArabic = i18n.language === "ar";

  // Arabic reshaper (same as Stock)
  function reshapeArabic(text) {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u0652]/g, "")
      .split(" ")
      .reverse()
      .join(" ");
  }

  const today = new Date().toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const content = [];

  // ---------------------------
  // HEADER
  // ---------------------------
  content.push({
    text: isArabic ? reshapeArabic(pharmacyName) : pharmacyName,
    style: "header",
    alignment: "center",
    margin: [0, 0, 0, 4]
  });

  content.push({
    text: isArabic
      ? reshapeArabic("تقرير  ديون  العملاء")
      : t("debtBook.printTitle"),
    style: "subheader",
    alignment: "center",
    margin: [0, 0, 0, 2]
  });

  content.push({
    text: today,
    alignment: "center",
    margin: [0, 0, 0, 20]
  });

  // ---------------------------
  // CUSTOMER BLOCKS
  // ---------------------------
  grouped.forEach((c) => {
    // Customer name
    content.push({
      text: isArabic ? reshapeArabic(c.name) : c.name,
      style: "customerName",
      margin: [0, 0, 0, 6]
    });

    // Initial debt
    content.push({
      text: isArabic
        ? reshapeArabic(`الدين  الابتدائي: ${c.initialDebt}`)
        : `${t("customer.initialDebt")}: ${c.initialDebt}`,
      margin: [0, 0, 0, 2]
    });

    // Current balance
    content.push({
      text: isArabic
        ? reshapeArabic(`الرصيد  الحالي: ${c.currentBalance}`)
        : `${t("customer.currentBalance")}: ${c.currentBalance}`,
      margin: [0, 0, 0, 8]
    });

    // ---------------------------
    // TABLE
    // ---------------------------
    const headerRow = isArabic
      ? [
          reshapeArabic("النوع"),
          reshapeArabic("التاريخ"),
          reshapeArabic("المبلغ")
        ]
      : [
          t("debtBook.kind"),
          t("debtBook.date"),
          t("debtBook.amount")
        ];

    const body = [
      headerRow,
      ...c.transactions.map((tRow) => [
        isArabic ? reshapeArabic(tRow.type) : tRow.type,
        tRow.date,
        tRow.amount
      ])
    ];

    content.push({
      table: {
        headerRows: 1,
        widths: ["*", "*", "*"],
        body
      },
      layout: {
        fillColor: (rowIndex) => (rowIndex === 0 ? "#f0f0f0" : null),
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5
      },
      margin: [0, 0, 0, 20]
    });
  });

  // ---------------------------
  // DOCUMENT DEFINITION
  // ---------------------------
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    pageDirection: isArabic ? "rtl" : "ltr",
    defaultStyle: {
      font: "Noto",
      fontSize: 12,
      alignment: isArabic ? "right" : "left"
    },
    styles: {
      header: { fontSize: 18, bold: true },
      subheader: { fontSize: 14, bold: true },
      customerName: { fontSize: 14, bold: true }
    },
    content
  };

  pdfMake.createPdf(docDefinition).download("customers-debt.pdf");
}


// -----------------------------
// EXPORT EXCEL
// -----------------------------
async function handleExportExcel() {
  const grouped = await buildGroupedData();

  const wsData = [];

  grouped.forEach((c) => {
    wsData.push([c.name]);
    wsData.push([
      t("customer.initialDebt"),
      c.initialDebt,
      t("customer.currentBalance"),
      c.currentBalance
    ]);

    wsData.push([
      t("debtBook.kind"),
      t("debtBook.date"),
      t("debtBook.amount")
    ]);

    c.transactions.forEach((tRow) => {
      wsData.push([tRow.type, tRow.date, tRow.amount]);
    });

    wsData.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Debt");
  XLSX.writeFile(wb, "customers-debt.xlsx");
}

// -----------------------------
// RENDER
// -----------------------------
return (
  <div dir={dir} className="bg-medical font-body text-on-background antialiased min-h-screen relative">
    <div className="fixed inset-0 bg-background/90 -z-10" />

    <TopAppBar />

    <div className="flex pt-16">
      <SideNavBar logo={logo} pharmacyName={pharmacyName} />

      <main className="flex-1 px-6 py-8 space-y-6 md:ml-64">
        
        {/* INSIGHTS */}
        <InsightCardGrid
          cards={cards}
          summary={
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-primary flex flex-col justify-center">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                {t("debtBook.totalOutstanding")}
              </span>

              <div className="text-4xl font-black text-primary-dim mt-2">
                {totalFp.formatted} {totalFp.symbol}
              </div>

              <div
                className={`text-xs mt-1 font-medium flex items-center gap-1
                  ${
                    debtChangePercent > 0
                      ? "text-red-600"
                      : debtChangePercent < 0
                      ? "text-green-600"
                      : "text-on-surface-variant"
                  }
                `}
              >
                <span className="material-symbols-outlined text-sm">
                  {debtChangePercent > 0
                    ? "arrow_upward"
                    : debtChangePercent < 0
                    ? "arrow_downward"
                    : "horizontal_rule"}
                </span>

                <span>
                  {debtChangePercent > 0 ? "+" : ""}
                  {debtChangePercent.toFixed(1)}%
                </span>

                <span className="text-on-surface-variant">
                  {t("debtBook.vsLastMonth")}
                </span>
              </div>
            </div>
          }
        />

        {/* HEADER + SEARCH + SORT + ADD + ICON EXPORTS */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {t("debtBook.pageTitle")}
            </h1>
            <p className="text-sm text-on-surface-variant">
              {t("debtBook.pageSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low"
            >
              <option value="name">{t("sort.name")}</option>
              <option value="debt">{t("sort.debt")}</option>
              <option value="lastPurchase">{t("sort.lastPurchase")}</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold shadow hover:bg-primary-dim transition"
            >
              {t("debtBook.addCustomer")}
            </button>

            {/* ICON EXPORTS */}
            <button
              onClick={handlePrintAll}
              className="px-2 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-primary flex items-center justify-center"
              title={t("debtBook.printAll")}
            >
              <span className="material-symbols-outlined">print</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-2 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-primary flex items-center justify-center"
              title={t("debtBook.exportPDF")}
            >
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-2 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-primary flex items-center justify-center"
              title={t("debtBook.exportExcel")}
            >
              <span className="material-symbols-outlined">table</span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        <DebtTable
          customers={filtered}
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onSettleCustomer={openSettleModal}
          onViewDetails={openDetails}
          onDeleteCustomer={handleDeleteCustomer}
        />
      </main>
    </div>

    {/* MODALS */}
    <AddCustomerModal
      open={showAddModal}
      onClose={() => setShowAddModal(false)}
      onAdded={() => load()}
    />

    <SettlePaymentModal
      open={settleModalOpen}
      onClose={() => setSettleModalOpen(false)}
      customer={selectedCustomer}
      onSettled={() => load()}
    />

    <CustomerDetailsModal
      open={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      customer={detailsCustomer}
    />

    <ConfirmModal
      open={deleteModalOpen}
      title={t("debtBook.deleteCustomerTitle")}
      message={t("debtBook.confirmDelete", { name: customerToDelete?.name })}
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
  </div>
);
}
