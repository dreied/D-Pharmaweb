// src/components/pos/CheckoutSummary.jsx
import { useTranslation } from "react-i18next";
import { useState } from "react";
import PrintReceiptButton from "./PrintReceiptButton";

import blueBg from "../../assets/checkout/blue-bg.png";
import greenBg from "../../assets/checkout/green-bg.png";

import AddCustomerModal from "../debt/AddCustomerModal";

export function CheckoutSummary({
  subtotalFormatted,
  subtotalSymbol,
  taxPercent,
  taxFormatted,
  taxSymbol,
  totalFormatted,
  totalSymbol,
  customers,
  selectedCustomerId,
  onCustomerChange,
  onTaxChange,
  theme,
  onCashPay,
  onAddToDebt,     // ⭐ REQUIRED
    lastSale,            // ⭐ ADD THIS
  pharmacySettings,    // ⭐ ADD THIS
  totalRaw
}) {
  const { t } = useTranslation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [partialPaid, setPartialPaid] = useState(0);

  const checkoutBg = theme === "blue" ? blueBg : greenBg;

  function handleCustomerSelect(e) {
    const value = e.target.value;

    if (value === "add_new") {
      setShowAddModal(true);
      return;
    }

    onCustomerChange(value ? Number(value) : null);
  }

  // ⭐ Correct debt handler — calls parent only
  async function handleDebtSale() {
    if (!selectedCustomerId) {
      return; // you can show toast here if you want
    }

    await onAddToDebt(partialPaid);

    // ⭐ Reset local UI
    setPartialPaid(0);
  }

  return (
   <div
  className="w-96 h-full flex flex-col relative overflow-y-auto shadow-2xl bg-cover bg-center"

  style={{ backgroundImage: `url(${checkoutBg})` }}
>

      <div className="absolute inset-0 bg-black/30"></div>

      <div className="relative z-20 flex flex-col p-8 text-white flex-1">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-1">
            {t("pos.transactionSummary")}
          </p>
          <h2 className="text-3xl font-headline font-black tracking-tight">
            {t("pos.checkout")}
          </h2>
        </div>

        {/* Summary */}
        <div className="space-y-4 flex-1">
          {/* Total */}
          <div className="flex justify-between items-center pt-8">
            <span className="text-xl font-headline">{t("pos.totalAmount")}</span>
            <span className="text-3xl font-headline font-black text-white flex items-baseline gap-2">
              <span>{totalFormatted}</span>
              <span className="text-yellow-300 text-lg">{totalSymbol}</span>
            </span>
          </div>

          {/* Debt Book */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-3">
              {t("pos.customerDebtBook")}
            </label>

            {/* Customer Select */}
            <div className="relative group">
              <select
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 appearance-none text-white focus:ring-2 focus:ring-white/40 transition-all outline-none"
                value={selectedCustomerId ?? ""}
                onChange={handleCustomerSelect}
              >
                <option value="add_new" className="text-slate-900 font-bold">
                  + {t("debtBook.addCustomer")}
                </option>

                <option value="" className="text-slate-900">
                  {t("pos.selectCustomer")}
                </option>

                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-white/60">
                  expand_more
                </span>
              </div>
            </div>

            {/* Partial payment */}
            {selectedCustomerId && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-white/70 mb-2">
                  {t("pos.debtPartialPaid")}
                </label>

                <input
                  type="number"
                  min="0"
                  max={totalRaw}
                  value={partialPaid}
                  onChange={(e) => setPartialPaid(Number(e.target.value) || 0)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white outline-none"
                  placeholder={t("pos.enterAmount")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => onCashPay(totalRaw)}
            className="bg-white text-primary px-6 py-4 rounded-xl font-headline font-extrabold hover:bg-white/90 transition-all flex flex-col items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined">payments</span>
            {t("pos.cash")}
          </button>

          <button
            onClick={handleDebtSale}
            className="bg-white/20 border border-white/30 text-white px-6 py-4 rounded-xl font-headline font-extrabold hover:bg-white/30 transition-all flex flex-col items-center gap-1 active:scale-95"
          >
            <span className="material-symbols-outlined">library_books</span>
            {t("pos.addToDebt")}
          </button>
        </div>
        {/* ⭐ Preview Receipt Button (only when a sale exists) */}
{lastSale && (
  <div className="mt-4">
    <PrintReceiptButton
      saleData={lastSale}
      pharmacySettings={pharmacySettings}
    />
  </div>
)}

      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={async () => {
          const updated = await db.customers.toArray();
          const newest = updated[updated.length - 1];
          if (newest) onCustomerChange(newest.id);
          setShowAddModal(false);
        }}
      />
    </div>
  );
}
