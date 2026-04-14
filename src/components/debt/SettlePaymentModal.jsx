import React, { useEffect, useState } from "react";
import { db } from "../../db";
import { useTranslation } from "react-i18next";
import { addCashToPharmacyBox } from "../../services/pharmacyBoxService";

export default function SettlePaymentModal({ open, onClose, customer, onSettled }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
useEffect(() => {
  if (open) setAmount("");
}, [open]);
  if (!open || !customer) return null;
async function recomputeCustomerBalance(customerId) {
  const [sales, payments, customer] = await Promise.all([
    db.sales.where("customerId").equals(customerId).toArray(),
    db.customerPayments.where("customerId").equals(customerId).toArray(),
    db.customers.get(customerId)
  ]);

  const pastDebt = customer.initialBalance || 0;

  const totalDebtCreatedBySales = sales.reduce(
    (sum, s) => sum + (s.total - (s.paidNow || 0)),
    0
  );

  const totalPayments = payments
    .filter((p) => p.type === "payment")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const totalRefunds = payments
    .filter((p) => p.type === "return" || p.type === "extra_refund")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const newBalance =
    pastDebt + totalDebtCreatedBySales - totalPayments - totalRefunds;

  await db.customers.update(customerId, {
    balance: newBalance,
    lastUpdated: new Date().toISOString()
  });
}




async function handleSubmit() {
  const paid = Number(amount);
  if (isNaN(paid) || paid <= 0) return;

  const now = new Date().toISOString();

  // 1) Add payment to customerPayments (negative = reduces debt)
  await db.customerPayments.add({
    customerId: customer.id,
    name: t("customer.payment"),
    amount: -Math.abs(paid),
    date: now,
    type: "payment"
  });

  // 2) Add money to pharmacy cashbox
  await addCashToPharmacyBox(
    paid,
    "customer_payment",
    t("cashbox.customerPaymentNote", { name: customer.name })

  );

  // 3) Recompute balance from REAL data and store it
  await recomputeCustomerBalance(customer.id);

  onSettled();
  onClose();
}





  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80 shadow-lg">

        <h2 className="text-lg font-bold mb-4">
          {t("debtBook.settlePayment")}
        </h2>

        <p className="text-sm mb-2">
          {t("debtBook.customer")}: <strong>{customer.name}</strong>
        </p>

        <p className="text-sm mb-4">
          {t("debtBook.totalDebt")}: <strong>{customer.totalDebtDisplay}</strong>
        </p>

        <input
          type="number"
          className="w-full px-3 py-2 border rounded-lg mb-4"
          placeholder={t("debtBook.enterAmount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            {t("common.confirm")}
          </button>
        </div>

      </div>
    </div>
  );
}
