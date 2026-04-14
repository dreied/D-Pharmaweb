// src/pages/CashBoxHistory.jsx
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useTranslation } from "react-i18next";
import { formatPrice } from "../currency";
import { useAppSettings } from "../useAppSettings";
import { useNavigate } from "react-router-dom";

import HomeCashBoxCard from "../components/HomeCashBoxCard";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";

import {
  withdrawFromPharmacyBox,
  closePharmacyCashbox
} from "../services/pharmacyBoxService";

// Chart.js
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

export default function CashBoxHistory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Currency
  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);

  // Filters
  const [filter, setFilter] = useState("all");

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawError, setWithdrawError] = useState("");

  // Close modal
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Collapsible days
  const [openDays, setOpenDays] = useState({});

  // Load history + balance
  const history = useLiveQuery(() => db.pharmacyBoxHistory.toArray(), []) || [];
  const box = useLiveQuery(() => db.pharmacyBox.get(1), []);
  const currentBalance = box?.amount || 0;

  // Profit formula
  function calculateProfit(entry) {
    if (!entry.qty || !entry.salePrice || !entry.purchasePrice) return 0;
    return entry.qty * entry.salePrice - entry.qty * entry.purchasePrice;
  }

  // Filtering logic
  function filterHistory(list) {
    const now = new Date();

    if (filter === "day") {
      return list.filter((h) => new Date(h.date).toDateString() === now.toDateString());
    }

    if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return list.filter((h) => new Date(h.date) >= weekAgo);
    }

    if (filter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return list.filter((h) => new Date(h.date) >= monthAgo);
    }

   if (filter === "supplier")
  return list.filter(
    (h) => h.type === "supplierPayment" || h.type === "supplier_return"
  );

    if (filter === "sales") return list.filter((h) => h.type === "sale");
    if (filter === "manual") return list.filter((h) => h.type === "manualInput");
    if (filter === "reset") return list.filter((h) =>
      ["reset", "monthlyReset", "manualReset"].includes(h.type)
    );
    if (filter === "dailyCash") return list.filter((h) => h.type === "dailyCash");
    if (filter === "withdraw") return list.filter((h) => h.type === "withdraw");

    return list;
  }

  const filtered = filterHistory(history);

  // Sort newest → oldest
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Group by day
  function groupByDay(list) {
    const map = {};
    list.forEach((h) => {
      const day = new Date(h.date).toDateString();
      if (!map[day]) map[day] = { cash: 0, profit: 0, entries: [] };
      map[day].cash += h.amount;
      map[day].profit += calculateProfit(h);
      map[day].entries.push(h);
    });
    return map;
  }

  const dailyGroups = groupByDay(sorted);

  // CSV Export
 function exportCSV() {
  const rows = [
    ["Date", "Amount", "Type", "Note"],
    ...sorted.map((h) => [
      new Date(h.date).toLocaleString(i18n.language),
      h.amount,
      h.type || "",
      h.note || ""
    ])
  ];

  const csv =
    "\uFEFF" + // ⭐ UTF‑8 BOM for Arabic support
    rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "pharmacy_cashbox_report.csv";
  a.click();
}


  // Icons
  const typeIcons = {
  supplierPayment: "payments",
  supplier_return: "keyboard_return",
  sale: "local_pharmacy",
  manualInput: "edit",
  dailyCash: "swap_vert",
  withdraw: "money_off",
  monthlyReset: "restart_alt",
  manualReset: "restart_alt",
  reset: "restart_alt",
  default: "account_balance_wallet"
};


  // Chart data
  const chartData = {
    labels: sorted.map((h) => new Date(h.date).toLocaleDateString()),
    datasets: [
      {
        label: t("cashbox.chartIncome"),
        data: sorted.map((h) => h.amount),
        borderColor: "#0ea5e9",
        backgroundColor: "rgba(14,165,233,0.2)",
        tension: 0.3
      }
    ]
  };

  return (
    <div
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
      className="bg-medical font-body text-on-background antialiased min-h-screen relative"
    >
      <div className="fixed inset-0 bg-background/90 -z-10" />

      <TopAppBar />

      <div className="flex pt-16">
        <SideNavBar />

        <main className="flex-1 px-6 py-8 space-y-6 md:ml-64">

          {/* Quick Card */}
          <HomeCashBoxCard />

          {/* Filters + Export */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {[
                ["all", t("cashbox.filterAll")],
                ["day", t("cashbox.filterDay")],
                ["week", t("cashbox.filterWeek")],
                ["month", t("cashbox.filterMonth")],
                ["supplier", t("cashbox.filterSupplierPayments")],
                ["sales", t("cashbox.filterSales")],
                ["manual", t("cashbox.filterManualInputs")],
                ["reset", t("cashbox.filterResets")],
                ["dailyCash", t("cashbox.filterDailyCash")],
                ["withdraw", t("cashbox.filterWithdraw")]
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`
                    px-4 py-2 rounded-full font-medium transition
                    ${
                      filter === key
                        ? "bg-primary text-on-primary shadow"
                        : "bg-surface-container-low hover:bg-surface-container-high"
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-full bg-primary text-on-primary font-bold shadow"
              >
                {t("cashbox.exportCSV")}
              </button>

              <button
                onClick={() => setShowWithdrawModal(true)}
                className="px-4 py-2 rounded-full bg-error text-on-error font-bold shadow"
              >
                {t("cashbox.withdraw")}
              </button>

              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container font-bold shadow"
              >
                {t("cashbox.closeBox")}
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="w-[50%] mx-auto p-4 rounded-2xl bg-surface-container-high shadow">
            <Line data={chartData} />
          </div>

          {/* DAILY GROUPS */}
          <div className="space-y-6">
            {Object.entries(dailyGroups)
              .sort((a, b) => new Date(b[0]) - new Date(a[0]))
              .map(([day, data], index) => {
                const isNewest = index === 0;
                const isOpen = openDays[day] ?? isNewest;

                return (
                  <div
                    key={day}
                    className="p-4 rounded-2xl bg-surface-container-high shadow"
                  >
                    {/* HEADER */}
                    <button
                      onClick={() =>
                        setOpenDays((prev) => ({ ...prev, [day]: !isOpen }))
                      }
                      className="w-full flex items-center justify-between"
                    >
                      <p className="text-lg font-bold">{day}</p>

                      <span
                        className={`material-symbols-outlined transition-transform ${
                          isOpen ? "rotate-180" : "rotate-0"
                        }`}
                      >
                        expand_more
                      </span>
                    </button>
                  

                    {/* SUMMARY */}
                    <div className="mt-2">
                      <p className="text-primary font-bold">
                        {t("cashbox.cash")}:{" "}
                        {
                          formatPrice(
                            data.cash,
                            useNewCurrency,
                            currencySymbol
                          ).formatted
                        }{" "}
                        {
                          formatPrice(
                            data.cash,
                            useNewCurrency,
                            currencySymbol
                          ).symbol
                        }
                      </p>

                      <p className="text-green-600 font-bold">
                        {t("cashbox.profit")}:{" "}
                        {
                          formatPrice(
                            data.profit,
                            useNewCurrency,
                            currencySymbol
                          ).formatted
                        }{" "}
                        {
                          formatPrice(
                            data.profit,
                            useNewCurrency,
                            currencySymbol
                          ).symbol
                        }
                      </p>
                    </div>

                    {/* COLLAPSIBLE CONTENT */}
                    {isOpen && (
                      <div className="mt-3 space-y-2">
                        {data.entries.map((h) => {
                          const { formatted, symbol } = formatPrice(
                            h.amount,
                            useNewCurrency,
                            currencySymbol
                          );

                          return (
                            <div
                              key={h.id}
                              className="p-3 rounded-xl bg-surface-container-low shadow flex justify-between items-center gap-3"
                            >
                              {/* ICON */}
                              <span className="material-symbols-outlined text-primary text-xl">
                                {typeIcons[h.type] || typeIcons.default}
                              </span>

                              {/* MAIN TEXT */}
                              <div className="flex flex-col flex-1">
                                <span
                                  className={
                                    h.color === "warning"
                                      ? "font-bold text-amber-600"
                                      : h.color === "danger"
                                      ? "font-bold text-red-600"
                                      : h.color === "success"
                                      ? "font-bold text-green-600"
                                      : "font-bold text-on-surface"
                                  }
                                >
                                  {formatted} {symbol}
                                </span>

                                <span className="text-xs text-on-surface-variant">
                                  {h.note}
                                </span>

                                {calculateProfit(h) !== 0 && (
                                  <span className="text-xs text-green-600 font-semibold">
                                    +
                                    {
                                      formatPrice(
                                        calculateProfit(h),
                                        useNewCurrency,
                                        currencySymbol
                                      ).formatted
                                    }{" "}
                                    {
                                      formatPrice(
                                        calculateProfit(h),
                                        useNewCurrency,
                                        currencySymbol
                                      ).symbol
                                    }
                                  </span>
                                )}
                              </div>

                              {/* TIME */}
                              <div className="text-sm text-on-surface-variant">
                                {new Date(h.date).toLocaleTimeString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* ⭐ WITHDRAW MODAL */}
          {showWithdrawModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-80 space-y-4">
                <h2 className="text-xl font-bold text-primary">
                  {t("cashbox.withdraw")}
                </h2>

                {/* ⭐ FORMATTED AMOUNT INPUT */}
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => {
                    let v = e.target.value.replace(/,/g, "").replace(/[^\d.]/g, "");
                    const parts = v.split(".");
                    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
                    const [intPart, decPart] = v.split(".");
                    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    setWithdrawAmount(decPart ? `${formattedInt}.${decPart}` : formattedInt);
                  }}
                  onBlur={() => {
                    if (!withdrawAmount) return;
                    const num = parseFloat(withdrawAmount.replace(/,/g, ""));
                    if (!isNaN(num)) {
                      const rounded = num.toFixed(2);
                      const [i, d] = rounded.split(".");
                      const formattedInt = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      setWithdrawAmount(`${formattedInt}.${d}`);
                    }
                  }}
                  placeholder={t("cashbox.enterAmount")}
                  className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline"
                />

                {/* NOTE */}
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder={t("cashbox.enterReason")}
                  className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline"
                />

                {/* ERROR */}
                {withdrawError && (
                  <div className="text-red-600 text-sm font-bold bg-red-100 p-2 rounded-lg">
                    {withdrawError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setWithdrawError("");
                      setWithdrawAmount("");
                      setWithdrawNote("");
                      setShowWithdrawModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high"
                  >
                    {t("cashbox.cancel")}
                  </button>

                  <button
                    onClick={async () => {
                      const cleaned = withdrawAmount.replace(/,/g, "");
                      const num = parseFloat(cleaned);

                      if (isNaN(num) || num <= 0) {
                        setWithdrawError(t("cashbox.invalidAmount"));
                        return;
                      }

                      const internal = useNewCurrency ? num * 100 : num;

                      if (internal > currentBalance) {
                        setWithdrawError(
                          t("cashbox.withdrawError", {
                            balance:
                              formatPrice(
                                currentBalance,
                                useNewCurrency,
                                currencySymbol
                              ).formatted +
                              " " +
                              formatPrice(
                                currentBalance,
                                useNewCurrency,
                                currencySymbol
                              ).symbol
                          })
                        );
                        return;
                      }

                      await withdrawFromPharmacyBox(internal, withdrawNote);

                      setWithdrawError("");
                      setWithdrawAmount("");
                      setWithdrawNote("");
                      setShowWithdrawModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-error text-on-error font-bold"
                  >
                    {t("cashbox.withdraw")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ⭐ CLOSE CASHBOX MODAL */}
          {showCloseModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-80 space-y-4">
                <h2 className="text-xl font-bold text-primary">
                  {t("cashbox.closeBox")}
                </h2>

                <p className="text-sm text-on-surface-variant">
                  {t("cashbox.closeBoxConfirm")}
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high"
                  >
                    {t("cashbox.cancel")}
                  </button>

                  <button
                    onClick={async () => {
                      await closePharmacyCashbox("manual");
                      setShowCloseModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-primary text-on-primary font-bold"
                  >
                    {t("cashbox.closeBox")}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
