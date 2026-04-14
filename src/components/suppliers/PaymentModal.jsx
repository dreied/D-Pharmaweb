import { useState, useMemo, useEffect  } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";
import { getHomeCashBoxAmount, addToHomeCashBox } from "../../services/homeCashBoxService";
import { getPharmacyBoxAmount, addCashToPharmacyBox } from "../../services/pharmacyBoxService";

export default function PaymentModal({ open, supplier, onClose }) {
  const { t, i18n } = useTranslation();

  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";
const homeCash = useLiveQuery(() => db.homeCashBox.get(1), []);
const pharmacyCash = useLiveQuery(() => db.pharmacyBox.get(1), []);

const homeAmount = homeCash?.amount ?? 0;
const pharmacyAmount = pharmacyCash?.amount ?? 0;

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  const totalOwed = supplier.pastBalance ?? 0;

  const [payAll, setPayAll] = useState(true);
  const [amount, setAmount] = useState(totalOwed);
const [paymentSource, setPaymentSource] = useState("homeFirst");

async function getNextTransactionId(prefix) {
  const last = await db.supplierPayments.orderBy("id").last();
  const nextNumber = last ? last.id + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
}

  const remaining = useMemo(() => {
    const paid = Number(amount || 0);
    const left = totalOwed - paid;
    return fmt(left);
  }, [amount, totalOwed, useNewCurrency, currencySymbol]);

  useEffect(() => {
  const totalOwed = supplier.pastBalance ?? 0;
  if (payAll) {
    setAmount(totalOwed);
  }
}, [supplier.pastBalance, payAll]);

  const balanceColor =
    totalOwed > 0
      ? "text-green-600"
      : totalOwed < 0
      ? "text-red-600"
      : "text-on-surface-variant";

 async function handleConfirm() {
  const value = Number(amount);
  if (value <= 0) return;

  const now = new Date().toISOString();

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

  await db.transaction(
    "rw",
    db.suppliers,
    db.supplierPayments,
    db.homeCashBox,
    db.homeCashBoxHistory,
    db.pharmacyBox,
    db.pharmacyBoxHistory,
    async () => {
      // 1. Record supplier payment
      await db.supplierPayments.add({
        supplierId: supplier.id,
        supplierName: supplier.name,
        amount: value,
        timestamp: now,
         transactionId : await getNextTransactionId("PH")

      });

      // 2. Update supplier balance
      await db.suppliers.update(supplier.id, {
        pastBalance: totalOwed - value
      });

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
    }
  );

  onClose();
}

 if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden glass-effect animate-in fade-in zoom-in duration-300">

        <div className="bg-gradient-to-r from-primary to-primary-dim p-5 text-on-primary relative">

          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 block mb-2">
            
          </span>

          <h3 className="text-2xl font-headline font-extrabold mb-1">
            {t("suppliers.makePayment")}
          </h3>

          <p className="text-on-primary/70 text-sm">{supplier.name}</p>

          <p className={`mt-2 text-sm font-bold ${balanceColor}`}>
            {t("suppliers.currentBalance")}:{" "}
            {fmt(totalOwed).formatted} {fmt(totalOwed).symbol}
          </p>
        </div>

        <div className="p-5">
          {/* Payment Type */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              {t("suppliers.paymentType")}
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Pay All */}
              <label className="relative flex flex-col items-center gap-3 p-3 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={payAll}
                  onChange={() => {
                    setPayAll(true);
                    setAmount(totalOwed);
                  }}
                />
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("suppliers.payAll")}
                </span>
                <div className="absolute inset-0 rounded-xl border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>

              {/* Partial */}
              <label className="relative flex flex-col items-center gap-3 p-2.5 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
                <input
                  type="radio"
                  className="sr-only peer"
                  checked={!payAll}
                  onChange={() => {
                    setPayAll(false);
                    setAmount("");
                  }}
                />
                <span className="material-symbols-outlined text-on-surface-variant">
                  edit_square
                </span>
                <span className="text-sm font-bold text-on-surface">
                  {t("suppliers.partial")}
                </span>
                <div className="absolute inset-0 rounded-xl border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </label>
            </div>
          </div>
{/* PAYMENT SOURCE */}
<div className="mb-4">
  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
    {t("homecash.paymentSource")}
  </label>

  <div className="grid grid-cols-2 gap-3">
    {/* Home First */}
    <label className="relative flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
      <input
        type="radio"
        className="sr-only peer"
        checked={paymentSource === "homeFirst"}
        onChange={() => setPaymentSource("homeFirst")}
      />
     <span className="material-symbols-outlined text-primary text-xl">
home</span>
      <span className="text-sm font-bold text-on-surface">
        {t("homecash.homeFirst")}
      </span>
      <div className="absolute inset-0 rounded-xl border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
    </label>

    {/* Pharmacy First */}
    <label className="relative flex flex-col items-center gap-3 p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
      <input
        type="radio"
        className="sr-only peer"
        checked={paymentSource === "pharmacyFirst"}
        onChange={() => setPaymentSource("pharmacyFirst")}
      />
      <span className="material-symbols-outlined text-on-surface-variant">local_pharmacy</span>
      <span className="text-sm font-bold text-on-surface">
        {t("homecash.pharmacyFirst")}
      </span>
      <div className="absolute inset-0 rounded-xl border-2 border-primary opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
    </label>
  </div>
</div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              {t("suppliers.amountToPay")}
            </label>

            <div className="relative">
              <span
                className={`absolute ${
                  i18n.language === "ar" ? "right-4" : "left-4"
                } top-1/2 -translate-y-1/2 font-headline font-bold text-on-surface-variant`}
              >
                {fmt(0).symbol}
              </span>

              <input
                type="number"
                className={`
                  w-full bg-surface-container-highest border-none rounded-xl py-4
                  font-headline font-black text-xl text-on-surface
                  focus:ring-2 focus:ring-primary/20 outline-none transition-all
                  ${
                    i18n.language === "ar"
                      ? "pr-16 pl-4"
                      : "pl-16 pr-4"
                  }
                `}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={payAll}
              />
            </div>

            <p className="mt-2 text-right text-xs text-on-surface-variant">
              {t("suppliers.remainingBalance")}: {remaining.formatted}{" "}
              {remaining.symbol}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:bg-primary-dim transition-all active:scale-[0.98]"
              onClick={handleConfirm}
            >
              {t("suppliers.confirmTransaction")}
            </button>

            <button
              className="w-full py-3 bg-transparent text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition-all"
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
