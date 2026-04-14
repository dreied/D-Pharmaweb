import React from "react";
import PaymentHistoryBar from "./PaymentHistoryBar";
import { useTranslation } from "react-i18next";

export default function DebtRow({ customer, onSettle, onViewDetails, onDelete }) {
  const { t } = useTranslation();

  const {
    name,
    lastPurchaseDateDisplay,
    totalDebt,
    totalDebtDisplay,
    statusKey,
    statusTone
  } = customer;

  // ⭐ Calculate overdue weeks
  let overdueWeeks = 0;

  if (lastPurchaseDateDisplay) {
    const lastDate = new Date(lastPurchaseDateDisplay);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    overdueWeeks = Math.floor(diffDays / 7);
  }

  // ⭐ Build overdue pattern
  let overduePattern = [];

  if (overdueWeeks >= 4) {
    overduePattern = ["red", "red", "red", "red"];
  } else {
    overduePattern = Array(4)
      .fill("neutral")
      .map((_, i) => (i < overdueWeeks ? "cyan" : "neutral"));
  }

  const statusColorClass =
    statusTone === "danger"
      ? "text-error"
      : statusTone === "warning"
      ? "text-on-surface"
      : "text-on-surface";

  return (
    <tr className="bg-surface-container-low/20 hover:bg-white/50 transition-colors">

      {/* CUSTOMER NAME */}
      <td className="px-6 py-5 w-1/4">
        <p
          className="font-bold text-primary text-sm cursor-pointer hover:underline"
          onClick={() => onViewDetails(customer)}
        >
          {name}
        </p>
      </td>

      {/* Last purchase */}
      <td className="px-6 py-5 w-1/5">
        <span className="text-sm font-medium text-on-surface-variant">
          {lastPurchaseDateDisplay || t("debtBook.noPurchases")}
        </span>
      </td>

      {/* Total debt */}
      <td className="px-6 py-5 w-1/5">
        <div className="flex flex-col">
          <span className={`text-sm font-extrabold ${statusColorClass}`}>
            {totalDebtDisplay}
          </span>
          <span className="text-[10px] text-outline italic">
            {statusKey ? t(statusKey) : ""}
          </span>
        </div>
      </td>

      {/* Payment history */}
      <td className="px-6 py-5 w-1/5">
        <PaymentHistoryBar pattern={overduePattern} />
      </td>

      {/* Actions */}
     <td className="px-6 py-5 w-1/5 text-right">
  <div className="flex justify-end gap-2">

    {/* Settle */}
    <button
      onClick={onSettle}
      className="px-4 py-2 bg-surface-container-highest text-on-surface font-bold text-xs rounded-lg hover:bg-primary hover:text-white transition-all"
    >
      {t("debtBook.settlePayment")}
    </button>

    {/* Delete — only if no debt */}
    {customer.totalDebt === 0 && (
      <button
        onClick={() => onDelete(customer)}
        className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
        title={t("common.delete")}
      >
        <span className="material-symbols-outlined text-lg">delete</span>
      </button>
    )}

  </div>
</td>

    </tr>
  );
}
