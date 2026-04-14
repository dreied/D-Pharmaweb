import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";

export default function SupplierCard({
  supplier,
  onMakePayment,
  onViewDetails,
  onEditSupplier,
  onDeleteSupplier
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Load currency settings
  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  // Format balance
  const balance = supplier.pastBalance ?? 0;
  const money = formatPrice(balance, useNewCurrency, currencySymbol);

  // Balance color logic
  const balanceColor =
    balance > 0
      ? "text-green-600"     // You owe supplier
      : balance < 0
      ? "text-red-600"       // Supplier owes you
      : "text-on-surface-variant"; // Zero

  // Prevent card click when clicking menu
  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="
        relative bg-surface-container-lowest rounded-xl overflow-hidden 
        shadow-sm hover:shadow-sky-900/5 border border-transparent 
        hover:border-primary/10 cursor-pointer transition
      "
      onClick={() => onViewDetails(supplier)}
    >

      {/* 3-dot menu button */}
      <button
        className="absolute top-3 end-3 p-1 rounded-full hover:bg-surface-container-high z-20"
        onClick={(e) => {
          stop(e);
          setMenuOpen(!menuOpen);
        }}
      >
        <span className="material-symbols-outlined text-on-surface">more_vert</span>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          className="absolute top-10 end-3 bg-white dark:bg-slate-800 shadow-lg rounded-lg w-40 z-30"
          onClick={stop}
        >
          <button
            className="w-full text-start px-4 py-2 hover:bg-surface-container-high"
            onClick={() => onEditSupplier(supplier)}
          >
            {t("suppliers.editSupplier")}
          </button>

          <button
            className="w-full text-start px-4 py-2 text-error hover:bg-error-container/20"
            onClick={() => onDeleteSupplier(supplier)}
          >
            {t("suppliers.deleteSupplier")}
          </button>
        </div>
      )}

      {/* Header image */}
      <div className="h-32 bg-surface-container relative overflow-hidden">
        <img
          src={supplier.imageUrl}
          className="w-full h-full object-cover opacity-60 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent" />

        <div className="absolute bottom-4 left-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center p-2">
            <span className="text-3xl">{supplier.icon}</span>
          </div>
          <h4 className="font-headline font-bold text-lg text-on-surface">
            {supplier.name}
          </h4>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-semibold text-on-surface-variant uppercase">
            {t("suppliers.totalOwed")}
          </span>

          <span className={`text-xl font-headline font-black ${balanceColor}`}>
            {money.formatted} {money.symbol}
          </span>
        </div>

        <button
          className="w-full py-2.5 bg-gradient-to-br from-primary to-primary-container 
                     text-on-primary rounded-lg font-bold text-xs shadow-md"
          onClick={(e) => {
            stop(e);
            onMakePayment(supplier);
          }}
        >
          {t("suppliers.makePayment")}
        </button>
      </div>
    </div>
  );
}
