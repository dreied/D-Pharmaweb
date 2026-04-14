import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";
import { getHomeCashBoxAmount, addToHomeCashBox } from "../../services/homeCashBoxService";
import { getPharmacyBoxAmount, addCashToPharmacyBox } from "../../services/pharmacyBoxService";

export default function SupplierStockPaymentModal({
  supplier,
  totalCost,
  onDone,
  onClose,
}) {
  const { t, i18n } = useTranslation();

  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  const pastBalance = supplier.pastBalance ?? 0;

  const homeCash = useLiveQuery(() => db.homeCashBox.get(1), []);
  const pharmacyCash = useLiveQuery(() => db.pharmacyBox.get(1), []);

  const homeAmount = homeCash?.amount ?? 0;
  const pharmacyAmount = pharmacyCash?.amount ?? 0;

  const [payAll, setPayAll] = useState(true);
  const [amount, setAmount] = useState(pastBalance);
  const [paymentSource, setPaymentSource] = useState("homeFirst");

  const remaining = useMemo(() => {
    const paid = Number(amount || 0);
    const left = pastBalance - paid;
    return fmt(left);
  }, [amount, pastBalance, useNewCurrency, currencySymbol]);

  const balanceColor =
    pastBalance > 0
      ? "text-green-600"
      : pastBalance < 0
      ? "text-red-600"
      : "text-on-surface-variant";
async function getNextTransactionId(prefix) {
  const last = await db.supplierPayments.orderBy("id").last();
  const nextNumber = last ? last.id + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
}

  async function handleConfirm() {
    const value = Number(amount || 0);
    if (value <= 0) return;

    const now = new Date().toISOString();
    const transactionId = await getNextTransactionId("STK");


    const home = homeAmount;
    const pharmacy = pharmacyAmount;

    let fromHome = 0;
    let fromPharmacy = 0;

    // USER PRIORITY LOGIC
    if (paymentSource === "homeFirst") {
      fromHome = Math.min(home, value);
      fromPharmacy = value - fromHome;
    } else {
      fromPharmacy = Math.min(pharmacy, value);
      fromHome = value - fromPharmacy;
    }

    // SAFETY: prevent negative
    if (fromHome > home || fromPharmacy > pharmacy) {
      alert(t("homecash.insufficientFunds"));
      return;
    }

    const newBalance = pastBalance - value;

    await db.transaction(
      "rw",
      db.suppliers,
      db.supplierPayments,
      db.supplierStockPurchases,
      db.homeCashBox,
      db.homeCashBoxHistory,
      db.pharmacyBox,
      db.pharmacyBoxHistory,
      async () => {
        // 1. Log stock purchase
        await db.supplierStockPurchases.add({
          supplierId: supplier.id,
          supplierName: supplier.name,
          totalCost,
          amountPaid: value,
          remainingBalance: newBalance,
          timestamp: now,
          transactionId,
          type: "stock_purchase",
        });

        // 2. Log supplier payment
        if (value > 0) {
          await db.supplierPayments.add({
  supplierId: supplier.id,
  supplierName: supplier.name,        // ⭐ REQUIRED
  amount: value,
  timestamp: now,                     // ⭐ CORRECT (matches schema)
  transactionId,                      // ⭐ REQUIRED
  method: "stock",
  note: `Stock purchase payment`,
});

        }

        
       // 3. Deduct from HomeCashBox
if (fromHome > 0) {
  await addToHomeCashBox(
    -fromHome,
    "supplierPayment",
    t("homecash.payToSupplier", { name: supplier.name })
  );
}


        // 4. Deduct from PharmacyBox
        if (fromPharmacy > 0) {
          await addCashToPharmacyBox(-fromPharmacy);
      
        }

        // 5. Update supplier balance
        await db.suppliers.update(supplier.id, {
          pastBalance: newBalance,
        });
      }
    );

    onDone?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden glass-effect">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-primary to-primary-dim p-5 text-on-primary relative">
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 block mb-1">
            {t("suppliers.transactionHub")}
          </span>

          <h3 className="text-xl font-headline font-extrabold mb-1">
            {t("suppliers.makePayment")}
          </h3>

          <p className="text-on-primary/70 text-sm">{supplier.name}</p>

          <p className={`mt-1 text-sm font-bold ${balanceColor}`}>
            {t("suppliers.currentBalance")}:{" "}
            {fmt(pastBalance).formatted} {fmt(pastBalance).symbol}
          </p>

          <p className="mt-1 text-xs">
            {t("suppliers.totalStockCost")}:{" "}
            {fmt(totalCost).formatted} {fmt(totalCost).symbol}
          </p>
        </div>

        {/* BODY */}
        <div className="p-5">

          {/* PAYMENT TYPE */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("suppliers.paymentType")}
            </label>

            <div className="grid grid-cols-2 gap-3">

              {/* PAY ALL */}
              <label className="relative flex flex-col items-center gap-2 p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={payAll}
                  onChange={() => {
                    setPayAll(true);
                    setAmount(pastBalance);
                  }}
                />
                <span
                  className="material-symbols-outlined text-primary text-xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("suppliers.payAll")}
                </span>
                <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>

              {/* PARTIAL */}
              <label className="relative flex flex-col items-center gap-2 p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={!payAll}
                  onChange={() => {
                    setPayAll(false);
                    setAmount("");
                  }}
                />
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  edit_square
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("suppliers.partial")}
                </span>
                <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>

            </div>
          </div>

          {/* PAYMENT SOURCE */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("homecash.paymentSource")}
            </label>

            <div className="grid grid-cols-2 gap-3">

              {/* Home First */}
              <label className="relative flex flex-col items-center gap-2 p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={paymentSource === "homeFirst"}
                  onChange={() => setPaymentSource("homeFirst")}
                />
                <span className="material-symbols-outlined text-primary text-xl">
                  home
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("homecash.homeFirst")}
                </span>
                <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>

              {/* Pharmacy First */}
              <label className="relative flex flex-col items-center gap-2 p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={paymentSource === "pharmacyFirst"}
                  onChange={() => setPaymentSource("pharmacyFirst")}
                />
                <span className="material-symbols-outlined text-on-surface-variant text-xl">
                  local_pharmacy
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("homecash.pharmacyFirst")}
                </span>
                <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>

            </div>
          </div>

          {/* AMOUNT INPUT */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t("suppliers.amountToPay")}
            </label>

            <div className="relative">
              <span
                className={`absolute ${
                  i18n.language === "ar" ? "right-3" : "left-3"
                } top-1/2 -translate-y-1/2 font-headline font-bold text-on-surface-variant`}
              >
                {fmt(0).symbol}
              </span>

              <input
                type="number"
                className={`
                  w-full bg-surface-container-highest border-none rounded-xl py-2.5
                  font-headline font-black text-lg text-on-surface
                  focus:ring-2 focus:ring-primary/20 outline-none transition-all
                  ${
                    i18n.language === "ar"
                      ? "pr-14 pl-3"
                      : "pl-14 pr-3"
                  }
                `}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={payAll}
              />
            </div>

            <p className="mt-1 text-right text-xs text-on-surface-variant">
              {t("suppliers.remainingBalance")}: {remaining.formatted}{" "}
              {remaining.symbol}
            </p>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-col gap-2">
            <button
              className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-dim transition-all active:scale-[0.98]"
              onClick={handleConfirm}
            >
              {t("suppliers.confirmTransaction")}
            </button>

            <button
              className="w-full py-2.5 bg-transparent text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition-all"
              onClick={onClose}
            >
              {t("suppliers.cancel")}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
