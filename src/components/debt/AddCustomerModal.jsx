import React, { useState } from "react";
import { db } from "../../db";
import { useTranslation } from "react-i18next";

export default function AddCustomerModal({ open, onClose, onAdded }) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pastDebt, setPastDebt] = useState("");

  if (!open) return null;

  async function handleAdd() {
    if (!name.trim()) return;

    const initialDebt = Number(pastDebt) || 0;

    // 1) Add customer with initial balance
    const newId = await db.customers.add({
  name,
  phone,
  balance: initialDebt,
  initialBalance: initialDebt,   // <-- CRITICAL FIX
  createdAt: new Date().toISOString()
});


    // 2) Register initial debt as a payment record
    if (initialDebt > 0) {
      await db.customerPayments.add({
        customerId: newId,
        name,
        amount: initialDebt,
        date: new Date().toISOString(),
        type: "initial"
      });
    }

    onAdded();
    onClose();

    // Reset fields
    setName("");
    setPhone("");
    setPastDebt("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-container-highest p-6 rounded-2xl shadow-xl w-96 border border-outline-variant">
        <h2 className="text-lg font-bold mb-4">{t("debtBook.addCustomer")}</h2>

        <div className="space-y-4">

          {/* Customer Name */}
          <input
            type="text"
            placeholder={t("customer.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-low"
          />

          {/* Phone */}
          <input
            type="text"
            placeholder={t("customer.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-low"
          />

          {/* Past Debt */}
          <input
            type="number"
            placeholder={t("debtBook.enterPastDebt")}
            value={pastDebt}
            onChange={(e) => setPastDebt(e.target.value)}
            className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-low"
          />

        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold"
          >
            {t("common.add")}
          </button>
        </div>
      </div>
    </div>
  );
}
