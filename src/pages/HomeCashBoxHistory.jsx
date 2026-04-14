// src/pages/HomeCashBoxHistory.jsx
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useTranslation } from "react-i18next";
import { formatPrice } from "../currency";
import { useAppSettings } from "../useAppSettings";
import { useNavigate } from "react-router-dom";
import {
  addToHomeCashBox,
  withdrawFromHomeCashBox
} from "../services/homeCashBoxService";

import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import HomeCashBoxCard from "../components/HomeCashBoxCard";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement);

export default function HomeCashBoxHistory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Add Money modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addError, setAddError] = useState("");

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [homeWithdrawError, setHomeWithdrawError] = useState("");

  // Collapsible days
  const [openDays, setOpenDays] = useState({});

  // Currency
  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);

  // Filters
  const [filter, setFilter] = useState("all");

  // History
  const history =
    useLiveQuery(() => db.homeCashBoxHistory.toArray(), []) || [];

  // ⭐ Current Home Cashbox balance
  const homeBox = useLiveQuery(() => db.homeCashBox.get(1), []);
  const homeCurrentBalance = homeBox?.amount || 0;

  // FILTER LOGIC
  function filterHistory(list) {
    const now = new Date();

    if (filter === "day") {
      return list.filter(
        (h) => new Date(h.date).toDateString() === now.toDateString()
      );
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
      return list.filter((h) => h.type === "supplierPayment");
    if (filter === "sales") return list.filter((h) => h.type === "sale");
    if (filter === "manual") return list.filter((h) => h.type === "manualInput");
    if (filter === "reset")
      return list.filter((h) =>
        ["reset", "monthlyReset", "manualReset"].includes(h.type)
      );
    if (filter === "withdraw")
      return list.filter((h) => h.type === "withdraw");

    return list;
  }

  const filtered = filterHistory(history);

  // ⭐ Sort newest → oldest
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // GROUP BY DAY
  function groupByDay(list) {
    const map = {};
    list.forEach((h) => {
      const day = new Date(h.date).toDateString();
      if (!map[day]) map[day] = { total: 0, entries: [] };
      map[day].total += h.amount;
      map[day].entries.push(h);
    });
    return map;
  }

  const dailyGroups = groupByDay(sorted);

  // ⭐ FORMAT INPUT (with decimals, commas, no rounding while typing)
  function formatInputWithCommas(value) {
    if (!value) return "";

    // Remove all non-digit except dot
    let cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");

    // Prevent multiple dots
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    // Add commas to integer part only
    const [intPart, decPart] = cleaned.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  }

  // ⭐ ROUND ON BLUR (limit to 2 decimals)
  function roundInput(value) {
    if (!value) return "";

    const cleaned = value.replace(/,/g, "");
    const num = parseFloat(cleaned);

    if (isNaN(num)) return "";

    const rounded = num.toFixed(2); // limit to 2 decimals
    return formatInputWithCommas(rounded);
  }

  // ⭐ VALIDATION (handles currency scaling)
  function validateAmountInput(raw) {
    if (!raw) {
      return { ok: false, error: t("homecash.amountInvalid") };
    }

    const cleaned = raw.replace(/,/g, "");
    const num = parseFloat(cleaned);

    if (isNaN(num) || num <= 0) {
      return { ok: false, error: t("homecash.amountInvalid") };
    }

    // Convert to internal storage units
    const internalValue = useNewCurrency ? num * 100 : num;

    return { ok: true, value: internalValue };
  }

  // CSV EXPORT (UTF‑8 BOM)
  function exportCSV() {
    const rows = [
      [
        t("homecash.csvDate"),
        t("homecash.csvAmount"),
        t("homecash.csvType"),
        t("homecash.csvNote")
      ],
      ...sorted.map((h) => [
        new Date(h.date).toLocaleString(i18n.language),
        h.amount,
        h.type || "",
        h.note || ""
      ])
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "homecashbox_report.csv";
    a.click();
  }

  // ICON MAP
  const typeIcons = {
    supplierPayment: "payments",
    sale: "attach_money",
    manualInput: "edit",
    dailyCash: "swap_vert",
    withdraw: "money_off",
    monthlyReset: "restart_alt",
    manualReset: "restart_alt",
    reset: "restart_alt",
    default: "account_balance_wallet"
  };

  // CHART DATA
  const chartData = {
    labels: sorted.map((h) => new Date(h.date).toLocaleDateString()),
    datasets: [
      {
        label: t("homecash.income"),
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
          {/* Back */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                if (window.history.length > 2) navigate(-1);
                else navigate("/dashboard");
              }}
              className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition"
            >
              <span className="material-symbols-outlined text-primary">
                arrow_back
              </span>
            </button>

            <h1 className="text-3xl font-bold">
              {t("homecash.historyTitle")}
            </h1>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="max-w-sm select-none pointer-events-none">
  <HomeCashBoxCard />
</div>


            <div className="w-full p-4 rounded-2xl bg-surface-container-high shadow">
              <Line data={chartData} />
            </div>
          </div>

          {/* Filters + Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {[
                ["all", t("homecash.filterAll")],
                ["day", t("homecash.filterDay")],
                ["week", t("homecash.filterWeek")],
                ["month", t("homecash.filterMonth")],
                ["supplier", t("homecash.filterSupplierPayments")],
                ["sales", t("homecash.filterSales")],
                ["manual", t("homecash.filterManualInputs")],
                ["reset", t("homecash.filterResets")],
                ["withdraw", t("homecash.filterWithdraw")]
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
                {t("homecash.exportCSV")}
              </button>

              {/* Add Money */}
              <button
                onClick={() => {
                  setAddError("");
                  setShowAddModal(true);
                }}
                className="px-4 py-2 rounded-full bg-secondary text-on-secondary font-bold shadow"
              >
                {t("homecash.addMoney")}
              </button>

              {/* Withdraw */}
              <button
                disabled={homeCurrentBalance <= 0}
                onClick={() =>
                  homeCurrentBalance > 0 && setShowWithdrawModal(true)
                }
                className={`
                  px-4 py-2 rounded-full font-bold shadow
                  ${
                    homeCurrentBalance > 0
                      ? "bg-error text-on-error"
                      : "bg-surface-container-low text-on-surface-variant opacity-50 cursor-not-allowed"
                  }
                `}
              >
                {t("homecash.withdraw")}
              </button>
            </div>
          </div>

          {/* ⭐ DAILY GROUPS */}
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
                    {/* Header */}
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

                    {/* Summary */}
                    <p className="text-primary font-bold mt-2">
                      {t("homecash.cash")}:{" "}
                      {
                        formatPrice(
                          data.total,
                          useNewCurrency,
                          currencySymbol
                        ).formatted
                      }{" "}
                      {
                        formatPrice(
                          data.total,
                          useNewCurrency,
                          currencySymbol
                        ).symbol
                      }
                    </p>

                    {/* Entries */}
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
                              <span className="material-symbols-outlined text-primary text-xl">
                                {typeIcons[h.type] || typeIcons.default}
                              </span>

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
                              </div>

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
          {/* ⭐ Add Money Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-80 space-y-4">
                <h2 className="text-xl font-bold text-primary">
                  {t("homecash.addMoney")}
                </h2>

                <input
                  type="text"
                  value={addAmount}
                  onChange={(e) => {
                    setAddAmount(formatInputWithCommas(e.target.value));
                  }}
                  onBlur={() => {
                    setAddAmount(roundInput(addAmount));
                  }}
                  placeholder={t("homecash.enterAmount")}
                  className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline"
                />

                {addError && (
                  <div className="text-red-600 text-sm font-bold bg-red-100 p-2 rounded-lg">
                    {addError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setAddError("");
                      setAddAmount("");
                      setShowAddModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high"
                  >
                    {t("homecash.cancel")}
                  </button>

                  <button
                    onClick={async () => {
                      const result = validateAmountInput(addAmount);
                      if (!result.ok) {
                        setAddError(result.error);
                        return;
                      }

                      await addToHomeCashBox(
                        result.value,
                        "manualInput",
                        t("homecash.manualInputRecord")
                      );

                      setAddError("");
                      setAddAmount("");
                      setShowAddModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-primary text-on-primary font-bold"
                  >
                    {t("homecash.add")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ⭐ Withdraw Modal */}
          {showWithdrawModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-surface-container-high p-6 rounded-2xl shadow-xl w-80 space-y-4">
                <h2 className="text-xl font-bold text-primary">
                  {t("homecash.withdraw")}
                </h2>

                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(formatInputWithCommas(e.target.value));
                  }}
                  onBlur={() => {
                    setWithdrawAmount(roundInput(withdrawAmount));
                  }}
                  placeholder={t("homecash.enterAmount")}
                  className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline"
                />

                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder={t("homecash.enterReason")}
                  className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline"
                />

                {/* ⭐ Localized Error Message */}
                {homeWithdrawError && (
                  <div className="text-red-600 text-sm font-bold bg-red-100 p-2 rounded-lg">
                    {homeWithdrawError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setHomeWithdrawError("");
                      setWithdrawAmount("");
                      setWithdrawNote("");
                      setShowWithdrawModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high"
                  >
                    {t("homecash.cancel")}
                  </button>

                  <button
                    onClick={async () => {
                      const result = validateAmountInput(withdrawAmount);
                      if (!result.ok) {
                        setHomeWithdrawError(result.error);
                        return;
                      }

                      const value = result.value;

                      if (value > homeCurrentBalance) {
                        setHomeWithdrawError(
                          t("homecash.homeWithdrawError", {
                            balance:
                              formatPrice(
                                homeCurrentBalance,
                                useNewCurrency,
                                currencySymbol
                              ).formatted +
                              " " +
                              formatPrice(
                                homeCurrentBalance,
                                useNewCurrency,
                                currencySymbol
                              ).symbol
                          })
                        );
                        return;
                      }

                      await withdrawFromHomeCashBox(value, withdrawNote);

                      setHomeWithdrawError("");
                      setWithdrawAmount("");
                      setWithdrawNote("");
                      setShowWithdrawModal(false);
                    }}
                    className="px-4 py-2 rounded-full bg-error text-on-error font-bold"
                  >
                    {t("homecash.withdraw")}
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
